import { NextRequest } from 'next/server';
import { GroupService } from '@/lib/services/groupService';
import { isValidUUID, checkRateLimit } from '@/lib/security/validation';
import {
  createSuccessResponse,
  createValidationError,
  createRateLimitError,
  createServerError,
  logApiRequest,
  logApiError
} from '@/lib/security/errorHandler';

/**
 * 🔒 그룹 정보 조회 API (보안 강화)
 * 
 * 데이터 보호:
 * 1. sessionId는 반환하지 않음 (민감 정보)
 * 2. 배틀태그는 부분 마스킹 (예: Test****#1234)
 * 3. Rate Limiting으로 무차별 대입 방지
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const endpoint = '/api/group/[groupId]';
  
  try {
    // Rate Limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = checkRateLimit(`group-get:${ip}`, 30, 60000);
    
    if (!rateLimit.allowed) {
      return createRateLimitError();
    }
    
    const { groupId } = await params;
    
    logApiRequest('GET', endpoint, { groupId });

    // 입력 검증
    if (!groupId || !isValidUUID(groupId)) {
      return createValidationError('유효하지 않은 그룹 ID입니다.');
    }

    const groupService = new GroupService();
    const result = await groupService.getGroupWithMembers(groupId);

    // 🔒 민감 정보 필터링
    const sanitizedMembers = result.members.map(member => {
      // 배틀태그 부분 마스킹 (프로덕션에서)
      let battleTag = member.profile?.battle_tag;
      if (battleTag && process.env.NODE_ENV === 'production') {
        // TestUser#1234 -> Test****#1234
        const [name, tag] = battleTag.split('#');
        if (name && tag && name.length > 4) {
          battleTag = name.substring(0, 4) + '****#' + tag;
        }
      }

      return {
        // sessionId는 절대 노출하지 않음
        position: member.position,
        isLeader: member.isLeader,
        profile: member.profile ? {
          nickname: member.profile.nickname,
          battleTag: battleTag, // 마스킹된 배틀태그
          introduction: member.profile.introduction,
          mainPosition: member.profile.main_position,
          currentTier: member.profile.current_tier,
          mainHeroes: member.profile.main_heroes,
          // id, session_id, expires_at 등은 노출하지 않음
        } : null
      };
    });

    return createSuccessResponse({
      group: {
        id: result.group.id,
        status: result.group.status,
        tankCount: result.group.tankCount,
        damageCount: result.group.damageCount,
        supportCount: result.group.supportCount,
        totalMembers: result.group.totalMembers,
        createdAt: result.group.createdAt,
        matchedAt: result.group.matchedAt,
        // leaderSessionId는 노출하지 않음
      },
      members: sanitizedMembers
    });

  } catch (error: any) {
    logApiError('GET', endpoint, error);
    return createServerError(error);
  }
}
