import { NextRequest } from 'next/server';
import { InquiryService } from '@/lib/services/inquiryService';
import {
  sanitizeInput,
  isValidInput,
  isValidUUID,
  checkRateLimit
} from '@/lib/security/validation';
import {
  validateAdminToken,
  extractTokenFromHeader
} from '@/lib/security/adminAuth';
import {
  createSuccessResponse,
  createValidationError,
  createAuthError,
  createRateLimitError,
  createServerError,
  safeJsonParse,
  logApiRequest,
  logApiError
} from '@/lib/security/errorHandler';

/**
 * 관리자 답변 작성 (보안 강화)
 * 
 * 🔐 보안 체크:
 * - ✅ 관리자 토큰 검증 (필수)
 * - ✅ Rate Limiting
 * - ✅ 입력 검증 및 XSS 방지
 */
export async function POST(request: NextRequest) {
  const endpoint = '/api/inquiry/reply';
  
  try {
    // 🔒 관리자 토큰 검증 (필수)
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      logApiError('POST', endpoint, { error: 'No token provided' });
      return createAuthError('관리자 인증이 필요합니다.');
    }
    
    const tokenValidation = validateAdminToken(token);
    if (!tokenValidation.valid) {
      logApiError('POST', endpoint, { error: tokenValidation.error });
      return createAuthError(tokenValidation.error || '인증에 실패했습니다.');
    }
    
    // Rate Limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = checkRateLimit(`inquiry-reply:${ip}`, 20, 60000); // 1분에 20개
    
    if (!rateLimit.allowed) {
      return createRateLimitError();
    }
    
    // JSON 파싱
    const body = await safeJsonParse<{
      inquiryId: string;
      adminReply: string;
    }>(request);
    
    if (!body) {
      return createValidationError('잘못된 요청 형식입니다.');
    }

    const { inquiryId, adminReply } = body;
    
    logApiRequest('POST', endpoint, { inquiryId, replyLength: adminReply?.length });

    // 필수 필드 검증
    if (!inquiryId || !adminReply) {
      return createValidationError('문의 ID와 답변 내용을 입력해주세요.');
    }
    
    // UUID 검증
    if (!isValidUUID(inquiryId)) {
      return createValidationError('유효하지 않은 문의 ID입니다.');
    }

    // 답변 길이 검증
    if (adminReply.trim().length < 10) {
      return createValidationError('답변은 최소 10자 이상 입력해주세요.');
    }
    
    if (adminReply.length > 5000) {
      return createValidationError('답변은 최대 5000자까지 입력 가능합니다.');
    }
    
    // XSS 방지
    const sanitizedReply = sanitizeInput(adminReply);
    
    // SQL Injection 방지
    if (!isValidInput(sanitizedReply, 5000)) {
      return createValidationError('답변 내용에 허용되지 않는 문자가 포함되어 있습니다.');
    }

    // 답변 작성
    const inquiryService = new InquiryService();
    const updatedInquiry = await inquiryService.replyToInquiry(inquiryId, sanitizedReply);

    return createSuccessResponse(
      updatedInquiry, 
      '답변이 성공적으로 등록되었습니다.'
    );

  } catch (error: any) {
    logApiError('POST', endpoint, error);
    return createServerError(error);
  }
}
