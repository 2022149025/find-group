/**
 * 에러 핸들링 및 안전한 응답 유틸리티
 */

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  statusCode: number;
}

export interface ApiSuccess<T = any> {
  success: true;
  data: T;
  message?: string;
}

export type ApiResponse<T = any> = ApiSuccess<T> | ApiError;

// 프로덕션 환경에서 민감한 정보 숨기기
export function sanitizeError(error: any): string {
  const isProd = process.env.NODE_ENV === 'production';
  
  if (isProd) {
    // 프로덕션에서는 일반적인 메시지만 반환
    if (error?.message?.includes('duplicate key')) {
      return '이미 존재하는 데이터입니다.';
    }
    if (error?.message?.includes('not found')) {
      return '요청한 데이터를 찾을 수 없습니다.';
    }
    if (error?.message?.includes('invalid')) {
      return '잘못된 요청입니다.';
    }
    return '요청 처리 중 오류가 발생했습니다.';
  }
  
  // 개발 환경에서는 상세 메시지
  return error?.message || '알 수 없는 오류가 발생했습니다.';
}

// 성공 응답 생성
export function createSuccessResponse<T>(
  data: T,
  message?: string
): Response {
  return Response.json({
    success: true,
    data,
    message
  } as ApiSuccess<T>, { status: 200 });
}

// 에러 응답 생성
export function createErrorResponse(
  error: string | Error,
  statusCode: number = 400,
  code?: string
): Response {
  const errorMessage = typeof error === 'string' 
    ? error 
    : sanitizeError(error);
  
  return Response.json({
    success: false,
    error: errorMessage,
    code,
    statusCode
  } as ApiError, { status: statusCode });
}

// 검증 에러
export function createValidationError(message: string): Response {
  return createErrorResponse(message, 400, 'VALIDATION_ERROR');
}

// 인증 에러
export function createAuthError(message: string = '인증이 필요합니다.'): Response {
  return createErrorResponse(message, 401, 'AUTH_ERROR');
}

// 권한 에러
export function createForbiddenError(message: string = '권한이 없습니다.'): Response {
  return createErrorResponse(message, 403, 'FORBIDDEN_ERROR');
}

// Not Found 에러
export function createNotFoundError(message: string = '요청한 리소스를 찾을 수 없습니다.'): Response {
  return createErrorResponse(message, 404, 'NOT_FOUND_ERROR');
}

// Rate Limit 에러
export function createRateLimitError(message: string = '너무 많은 요청을 보냈습니다. 잠시 후 다시 시도해주세요.'): Response {
  return createErrorResponse(message, 429, 'RATE_LIMIT_ERROR');
}

// 서버 에러
export function createServerError(error: any): Response {
  console.error('[Server Error]', error);
  return createErrorResponse(
    sanitizeError(error),
    500,
    'INTERNAL_SERVER_ERROR'
  );
}

// 안전한 JSON 파싱
export async function safeJsonParse<T>(request: Request): Promise<T | null> {
  try {
    const body = await request.json();
    return body as T;
  } catch (error) {
    console.error('[JSON Parse Error]', error);
    return null;
  }
}

// 로깅 유틸리티
export function logApiRequest(
  method: string,
  endpoint: string,
  params?: any
): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${method} ${endpoint}`, params ? JSON.stringify(params) : '');
}

export function logApiError(
  method: string,
  endpoint: string,
  error: any
): void {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR ${method} ${endpoint}`, error);
}
