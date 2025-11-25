import { NextRequest } from 'next/server';
import { GroupService } from '@/lib/services/groupService';
import { isValidSessionId, isValidPosition, checkRateLimit } from '@/lib/security/validation';
import {
  createSuccessResponse,
  createValidationError,
  createRateLimitError,
  createServerError,
  safeJsonParse,
  logApiRequest,
  logApiError
} from '@/lib/security/errorHandler';

export async function POST(request: NextRequest) {
  const endpoint = '/api/group/create';
  
  try {
    // Rate Limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = checkRateLimit(`group-create:${ip}`, 10, 60000); // 1분에 10개
    
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

    // 그룹 생성
    const groupService = new GroupService();
    const group = await groupService.createGroup(sessionId, position);

    return createSuccessResponse(group, '그룹이 성공적으로 생성되었습니다.');

  } catch (error: any) {
    logApiError('POST', endpoint, error);
    return createServerError(error);
  }
}
