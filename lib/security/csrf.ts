/**
 * CSRF (Cross-Site Request Forgery) 방어 시스템
 * 
 * 🔒 보안 원칙:
 * - Double Submit Cookie 패턴 사용
 * - Origin/Referer 헤더 검증
 * - 관리자 API에 필수 적용
 */

import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';

// CSRF 토큰 저장소 (메모리 기반 - 프로덕션에서는 Redis 권장)
const csrfTokens = new Map<string, { token: string; expiresAt: number }>();

/**
 * CSRF 토큰 생성
 */
export function generateCSRFToken(identifier: string): string {
  const token = randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 3600000; // 1시간
  
  // 기존 토큰 삭제 후 새 토큰 저장
  csrfTokens.set(identifier, { token, expiresAt });
  
  // 만료된 토큰 정리
  cleanupExpiredTokens();
  
  return token;
}

/**
 * CSRF 토큰 검증
 */
export function validateCSRFToken(identifier: string, token: string): boolean {
  const stored = csrfTokens.get(identifier);
  
  if (!stored) {
    console.warn(`[CSRF] No token found for identifier: ${identifier.substring(0, 8)}...`);
    return false;
  }
  
  // 만료 확인
  if (Date.now() > stored.expiresAt) {
    csrfTokens.delete(identifier);
    console.warn(`[CSRF] Token expired for identifier: ${identifier.substring(0, 8)}...`);
    return false;
  }
  
  // 토큰 일치 확인
  const isValid = stored.token === token;
  
  if (!isValid) {
    console.warn(`[CSRF] Token mismatch for identifier: ${identifier.substring(0, 8)}...`);
  }
  
  return isValid;
}

/**
 * CSRF 토큰 삭제
 */
export function revokeCSRFToken(identifier: string): boolean {
  return csrfTokens.delete(identifier);
}

/**
 * 만료된 토큰 정리
 */
function cleanupExpiredTokens(): void {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [identifier, data] of csrfTokens.entries()) {
    if (now > data.expiresAt) {
      csrfTokens.delete(identifier);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`[CSRF] Cleaned up ${cleaned} expired tokens`);
  }
}

/**
 * Origin 헤더 검증
 */
export function validateOrigin(request: NextRequest): {
  valid: boolean;
  error?: string;
} {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  
  // Same-origin 요청 (origin 없음)
  if (!origin) {
    return { valid: true };
  }
  
  // 허용된 Origin 목록
  const allowedOrigins = [
    `https://${host}`,
    'http://localhost:3000',
    'https://find-group.vercel.app'
  ];
  
  // 개발 환경: localhost 모든 포트 허용
  if (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost')) {
    return { valid: true };
  }
  
  const isValid = allowedOrigins.some(allowed => origin === allowed || origin.startsWith(allowed));
  
  if (!isValid) {
    console.warn(`[CSRF] Invalid origin: ${origin}`);
    return { 
      valid: false, 
      error: `Origin ${origin} is not allowed` 
    };
  }
  
  return { valid: true };
}

/**
 * Referer 헤더 검증
 */
export function validateReferer(request: NextRequest): {
  valid: boolean;
  error?: string;
} {
  const referer = request.headers.get('referer');
  
  // Referer 없음 (직접 접근 등)
  if (!referer) {
    return { valid: true };
  }
  
  const host = request.headers.get('host');
  const allowedHosts = [
    host,
    'localhost',
    'find-group.vercel.app'
  ];
  
  const isValid = allowedHosts.some(allowed => 
    referer.includes(allowed || '')
  );
  
  if (!isValid) {
    console.warn(`[CSRF] Invalid referer: ${referer}`);
    return { 
      valid: false, 
      error: `Referer ${referer} is not allowed` 
    };
  }
  
  return { valid: true };
}

/**
 * 종합 CSRF 검증 (Origin + Referer)
 */
export function validateCSRFHeaders(request: NextRequest): {
  valid: boolean;
  error?: string;
} {
  // 1. Origin 검증
  const originCheck = validateOrigin(request);
  if (!originCheck.valid) {
    return originCheck;
  }
  
  // 2. Referer 검증
  const refererCheck = validateReferer(request);
  if (!refererCheck.valid) {
    return refererCheck;
  }
  
  return { valid: true };
}

/**
 * Request에서 CSRF 토큰 추출
 */
export function extractCSRFToken(request: NextRequest): string | null {
  // 1. 헤더에서 추출 (권장)
  const headerToken = request.headers.get('x-csrf-token');
  if (headerToken) return headerToken;
  
  // 2. 쿠키에서 추출 (대안)
  const cookieToken = request.cookies.get('csrf-token')?.value;
  if (cookieToken) return cookieToken;
  
  return null;
}

/**
 * 활성 토큰 수 조회
 */
export function getActiveCSRFTokenCount(): number {
  cleanupExpiredTokens();
  return csrfTokens.size;
}

// 주기적으로 만료된 토큰 정리 (1분마다)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cleanupExpiredTokens();
  }, 60000);
}
