import { NextRequest } from 'next/server';
import { ProfileService, ProfileInput } from '@/lib/services/profileService';
import {
  sanitizeInput,
  isValidInput,
  isValidNickname,
  isValidBattleTag,
  isValidPosition,
  checkRateLimit
} from '@/lib/security/validation';
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
  const endpoint = '/api/profile/create';
  
  try {
    // Rate Limiting 체크 (IP 기반)
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = checkRateLimit(`profile-create:${ip}`, 5, 60000); // 1분에 5개
    
    if (!rateLimit.allowed) {
      logApiRequest('POST', endpoint, { ip, rateLimitExceeded: true });
      return createRateLimitError();
    }
    
    // JSON 파싱
    const body = await safeJsonParse<ProfileInput>(request);
    if (!body) {
      return createValidationError('잘못된 요청 형식입니다.');
    }
    
    logApiRequest('POST', endpoint, { nickname: body.nickname, position: body.mainPosition });
    
    // 입력 검증
    if (!body.nickname || !isValidNickname(body.nickname)) {
      return createValidationError('닉네임은 2-20자의 한글, 영문, 숫자만 사용 가능합니다.');
    }
    
    if (!body.battleTag || !isValidBattleTag(body.battleTag)) {
      return createValidationError('배틀태그 형식이 올바르지 않습니다. (예: PlayerName#1234)');
    }
    
    if (!body.mainPosition || !isValidPosition(body.mainPosition)) {
      return createValidationError('올바른 포지션을 선택해주세요.');
    }
    
    // XSS 방지: 입력값 sanitize
    const sanitizedBody: ProfileInput = {
      ...body,
      nickname: sanitizeInput(body.nickname),
      battleTag: sanitizeInput(body.battleTag),
      introduction: body.introduction ? sanitizeInput(body.introduction) : undefined
    };
    
    // SQL Injection 방지 검증
    if (!isValidInput(sanitizedBody.nickname) || !isValidInput(sanitizedBody.battleTag)) {
      return createValidationError('입력값에 허용되지 않는 문자가 포함되어 있습니다.');
    }
    
    // 프로필 생성
    const profileService = new ProfileService();
    const profile = await profileService.createTemporaryProfile(sanitizedBody);

    return createSuccessResponse(profile, '프로필이 성공적으로 생성되었습니다.');

  } catch (error: any) {
    logApiError('POST', endpoint, error);
    return createServerError(error);
  }
}
