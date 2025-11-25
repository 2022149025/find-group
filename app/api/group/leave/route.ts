import { NextRequest } from 'next/server';
import { GroupService } from '@/lib/services/groupService';
import { 
  isValidUUID, 
  isValidSessionId, 
  checkRateLimit 
} from '@/lib/security/validation';
import {
  validateGroupMembership
} from '@/lib/security/authorization';
import {
  createSuccessResponse,
  createValidationError,
  createForbiddenError,
  createRateLimitError,
  createServerError,
  safeJsonParse,
  logApiRequest,
  logApiError
} from '@/lib/security/errorHandler';

/**
 * 🔒 그룹 나가기 API (보안 강화)
 * 
 * IDOR 방어:
 * 1. 멤버십 검증 (DB에서 실제 멤버인지 확인)
 * 2. 자신만 자신을 나가게 할 수 있음
 */
export async function POST(request: NextRequest) {
  const endpoint = '/api/group/leave';
  
  try {
    // Rate Limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = checkRateLimit(`group-leave:${ip}`, 20, 60000);
    
    if (!rateLimit.allowed) {
      return createRateLimitError();
    }
    
    // JSON 파싱
    const body = await safeJsonParse<{
      groupId: string;
      sessionId: string;
    }>(request);
    
    if (!body) {
      return createValidationError('잘못된 요청 형식입니다.');
    }

    const { groupId, sessionId } = body;
    
    logApiRequest('POST', endpoint, { groupId, sessionId });

    // 입력 검증
    if (!groupId || !isValidUUID(groupId)) {
      return createValidationError('유효하지 않은 그룹 ID입니다.');
    }

    if (!sessionId || !isValidSessionId(sessionId)) {
      return createValidationError('유효하지 않은 세션 ID입니다.');
    }

    // 🔒 권한 검증: 멤버십 확인
    const membership = await validateGroupMembership(groupId, sessionId);
    if (!membership.valid) {
      logApiError('POST', endpoint, { error: membership.error });
      return createForbiddenError(membership.error);
    }

    const groupService = new GroupService();
    
    // 그룹장인 경우 그룹장 인계 또는 그룹 삭제
    if (membership.isLeader) {
      await groupService.transferLeadership(groupId, sessionId);
      return createSuccessResponse(
        { left: true, transferredLeadership: true },
        '그룹장 권한이 인계되었습니다.'
      );
    }

    // 일반 멤버인 경우 탈퇴 처리
    await groupService.removeMember(groupId, sessionId);

    return createSuccessResponse(
      { left: true },
      '그룹에서 성공적으로 나갔습니다.'
    );

  } catch (error: any) {
    logApiError('POST', endpoint, error);
    return createServerError(error);
  }
}
