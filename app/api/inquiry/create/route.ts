import { NextRequest } from 'next/server';
import { InquiryService } from '@/lib/services/inquiryService';
import {
  sanitizeInput,
  isValidInput,
  isValidEmail,
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
  const endpoint = '/api/inquiry/create';
  
  try {
    // Rate Limiting (더 엄격하게: 1분에 3개)
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = checkRateLimit(`inquiry-create:${ip}`, 3, 60000);
    
    if (!rateLimit.allowed) {
      logApiRequest('POST', endpoint, { ip, rateLimitExceeded: true });
      return createRateLimitError('문의를 너무 자주 작성하고 있습니다. 잠시 후 다시 시도해주세요.');
    }
    
    // JSON 파싱
    const body = await safeJsonParse<{
      name: string;
      email: string;
      category: string;
      title: string;
      content: string;
    }>(request);
    
    if (!body) {
      return createValidationError('잘못된 요청 형식입니다.');
    }

    const { name, email, category, title, content } = body;
    
    logApiRequest('POST', endpoint, { email, category, title });

    // 필수 필드 검증
    if (!name || !email || !category || !title || !content) {
      return createValidationError('모든 필드를 입력해주세요.');
    }

    // 이메일 형식 검사
    if (!isValidEmail(email)) {
      return createValidationError('올바른 이메일 형식이 아닙니다.');
    }

    // 카테고리 검사
    const validCategories = ['bug', 'feature', 'suggestion', 'other'];
    if (!validCategories.includes(category)) {
      return createValidationError('올바른 문의 유형이 아닙니다.');
    }
    
    // 길이 검증
    if (name.length < 2 || name.length > 50) {
      return createValidationError('이름은 2-50자 이내로 입력해주세요.');
    }
    
    if (title.length < 5 || title.length > 200) {
      return createValidationError('제목은 5-200자 이내로 입력해주세요.');
    }
    
    if (content.length < 10 || content.length > 2000) {
      return createValidationError('내용은 10-2000자 이내로 입력해주세요.');
    }
    
    // XSS 방지
    const sanitizedData = {
      name: sanitizeInput(name),
      email: sanitizeInput(email),
      category: category as 'bug' | 'feature' | 'suggestion' | 'other',
      title: sanitizeInput(title),
      content: sanitizeInput(content)
    };
    
    // SQL Injection 방지
    if (!isValidInput(sanitizedData.name, 50) || 
        !isValidInput(sanitizedData.title, 200) || 
        !isValidInput(sanitizedData.content, 2000)) {
      return createValidationError('입력값에 허용되지 않는 문자가 포함되어 있습니다.');
    }

    // 문의 생성
    const inquiryService = new InquiryService();
    const inquiry = await inquiryService.createInquiry(sanitizedData);

    return createSuccessResponse(
      inquiry, 
      '문의가 성공적으로 접수되었습니다. 빠른 시일 내에 답변드리겠습니다.'
    );

  } catch (error: any) {
    logApiError('POST', endpoint, error);
    return createServerError(error);
  }
}
