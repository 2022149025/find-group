import { NextRequest } from 'next/server';
import { MatchingService } from '@/lib/services/matchingService';
import { isValidSessionId, isValidPosition, checkRateLimit } from '@/lib/security/validation';
import {
  createSuccessResponse,
  createValidationError,
  createNotFoundError,
  createRateLimitError,
  createServerError,
  safeJsonParse,
  logApiRequest,
  logApiError
} from '@/lib/security/errorHandler';

export async function POST(request: NextRequest) {
  const endpoint = '/api/group/join';
  
  try {
    // Rate Limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = checkRateLimit(`group-join:${ip}`, 20, 60000);
    
    if (!rateLimit.allowed) {
      return createRateLimitError();
    }
    
    // JSON 파싱
    const body = await safeJsonParse<{ sessionId: string; position: string }>(request);
    if (!body) {
      return createValidationError('잘못된 요청 형식입니다.');
    }
    
    const { sessionId, position } = body;
    logApiRequest('POST', endpoint, { sessionId, position });

    // 입력 검증
    if (!sessionId || !isValidSessionId(sessionId)) {
      return createValidationError('유효하지 않은 세션 ID입니다.');
    }

    if (!position || !isValidPosition(position)) {
      return createValidationError('올바른 포지션을 선택해주세요.');
    }

    const matchingService = new MatchingService();
    
    // 매칭 통계 먼저 확인
    const stats = await matchingService.getMatchingStats();
    console.log(`[API /api/group/join] 매칭 통계:`, stats);

    const result = await matchingService.autoMatchGroup(sessionId, position);

    if (!result.joined) {
      logApiRequest('POST', endpoint, { matched: false, waitingGroups: stats.totalWaitingGroups });
      return createNotFoundError(
        `${position} 포지션의 빈자리가 있는 그룹을 찾지 못했습니다. 잠시 후 다시 시도하거나 '그룹장으로 시작'을 선택해주세요.`
      );
    }

    return createSuccessResponse(result, '그룹에 성공적으로 참가했습니다.');

  } catch (error: any) {
    logApiError('POST', endpoint, error);
    return createServerError(error);
  }
}
