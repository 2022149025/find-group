import { NextRequest, NextResponse } from 'next/server';
import { createAdminSession } from '@/lib/security/adminAuth';
import { checkRateLimit } from '@/lib/security/validation';
import { generateCSRFToken, validateCSRFHeaders } from '@/lib/security/csrf';
import {
  safeJsonParse,
  createValidationError,
  createAuthError,
  createRateLimitError,
  createServerError,
  logApiRequest,
  logApiError
} from '@/lib/security/errorHandler';

/**
 * 관리자 로그인 API
 * POST /api/auth/admin/login
 * 
 * 🔒 보안:
 * - Rate Limiting: 5회/분 (무차별 대입 방지)
 * - 토큰 기반 인증
 * - IP 로깅
 */
export async function POST(request: NextRequest) {
  const endpoint = '/api/auth/admin/login';
  
  try {
    // 1. CSRF 헤더 검증 (Origin/Referer)
    const csrfCheck = validateCSRFHeaders(request);
    if (!csrfCheck.valid) {
      return NextResponse.json(
        { success: false, error: 'CSRF validation failed' },
        { status: 403 }
      );
    }
    
    // 2. Rate Limiting (더 엄격: 5회/분)
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = checkRateLimit(`admin-login:${ip}`, 5, 60000);
    
    if (!rateLimit.allowed) {
      logApiRequest('POST', endpoint, { ip, rateLimitExceeded: true });
      return createRateLimitError('너무 많은 로그인 시도입니다. 1분 후 다시 시도해주세요.');
    }
    
    const body = await safeJsonParse<{ password: string }>(request);
    
    if (!body || !body.password) {
      return createValidationError('비밀번호를 입력해주세요.');
    }
    
    const { password } = body;
    
    logApiRequest('POST', endpoint, { ip });
    
    // 최소 길이 검증
    if (password.length < 4) {
      return createAuthError('비밀번호는 최소 4자 이상이어야 합니다.');
    }
    
    // 관리자 세션 생성 (비밀번호 검증 포함)
    const result = await createAdminSession(password, ip);
    
    if (!result.success) {
      logApiError('POST', endpoint, { error: result.error, ip });
      return createAuthError(result.error);
    }
    
    // CSRF 토큰 생성 (Bearer Token과 별도)
    const csrfToken = generateCSRFToken(result.token || '');
    
    // Double Submit Cookie 패턴: 쿠키와 헤더 모두에 토큰 전송
    const response = NextResponse.json(
      {
        success: true,
        data: {
          token: result.token,
          csrfToken,  // 클라이언트가 헤더로 보내야 함
          expiresIn: result.expiresIn,
          expiresAt: Date.now() + (result.expiresIn || 0)
        },
        message: '관리자 로그인 성공'
      },
      { status: 200 }
    );
    
    // CSRF 토큰을 SameSite=Strict 쿠키로 설정
    response.cookies.set('csrf-token', csrfToken, {
      httpOnly: true,      // JavaScript 접근 불가 (XSS 방어)
      secure: process.env.NODE_ENV === 'production',  // HTTPS only (프로덕션)
      sameSite: 'strict',  // CSRF 방어
      path: '/',
      maxAge: 3600         // 1시간
    });
    
    return response;
    
  } catch (error: any) {
    logApiError('POST', endpoint, error);
    return createServerError(error);
  }
}
