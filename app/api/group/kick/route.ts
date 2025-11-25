import { NextRequest } from 'next/server';
import { GroupService } from '@/lib/services/groupService';
import { 
  isValidUUID, 
  isValidSessionId, 
  checkRateLimit 
} from '@/lib/security/validation';
import {
  validateGroupLeadership,
  validateTargetMembership
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
 * 🔒 멤버 강제 퇴장 API (보안 강화)
 * 
 * IDOR 방어:
 * 1. 리더 권한 검증 (DB에서 확인)
 * 2. 타겟 멤버십 검증 (실제 그룹 멤버인지 확인)
 * 3. 리더는 킥할 수 없음
 */
export async function POST(request: NextRequest) {
  const endpoint = '/api/group/kick';
  
  try {
    // Rate Limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = checkRateLimit(`group-kick:${ip}`, 10, 60000);
    
    if (!rateLimit.allowed) {
      return createRateLimitError();
    }
    
    // JSON 파싱
    const body = await safeJsonParse<{
      groupId: string;
      leaderSessionId: string;
      targetSessionId: string;
    }>(request);
    
    if (!body) {
      return createValidationError('잘못된 요청 형식입니다.');
    }

    const { groupId, leaderSessionId, targetSessionId } = body;
    
    logApiRequest('POST', endpoint, { groupId, leaderSessionId, targetSessionId });

    // 입력 검증
    if (!groupId || !isValidUUID(groupId)) {
      return createValidationError('유효하지 않은 그룹 ID입니다.');
    }

    if (!leaderSessionId || !isValidSessionId(leaderSessionId)) {
      return createValidationError('유효하지 않은 리더 세션 ID입니다.');
    }

    if (!targetSessionId || !isValidSessionId(targetSessionId)) {
      return createValidationError('유효하지 않은 대상 세션 ID입니다.');
    }

    // 자기 자신을 킥할 수 없음
    if (leaderSessionId === targetSessionId) {
      return createValidationError('자기 자신을 강제 퇴장시킬 수 없습니다.');
    }

    // 🔒 권한 검증 1: 리더 권한 확인
    const leaderCheck = await validateGroupLeadership(groupId, leaderSessionId);
    if (!leaderCheck.valid) {
      logApiError('POST', endpoint, { error: leaderCheck.error });
      return createForbiddenError(leaderCheck.error);
    }

    // 🔒 권한 검증 2: 타겟이 실제 그룹 멤버인지 확인
    const targetCheck = await validateTargetMembership(groupId, targetSessionId);
    if (!targetCheck.valid) {
      logApiError('POST', endpoint, { error: targetCheck.error });
      return createValidationError(targetCheck.error || '대상 멤버 검증에 실패했습니다.');
    }

    // 킥 실행
    const groupService = new GroupService();
    await groupService.kickMember(groupId, leaderSessionId, targetSessionId);

    return createSuccessResponse(
      { kicked: true },
      '멤버가 성공적으로 강제 퇴장되었습니다.'
    );

  } catch (error: any) {
    logApiError('POST', endpoint, error);
    return createServerError(error);
  }
}
