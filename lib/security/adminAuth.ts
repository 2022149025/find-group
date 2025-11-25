/**
 * 관리자 인증 시스템 (토큰 기반)
 * 
 * 🔒 보안 개선:
 * - 환경변수 비밀번호만으로는 부족
 * - 서버 측 세션 토큰 발급
 * - API 호출 시 토큰 검증 필수
 */

import { createHash, randomBytes } from 'crypto';

interface AdminSession {
  token: string;
  createdAt: number;
  expiresAt: number;
  ip?: string;
}

// 관리자 세션 저장소 (메모리 - 서버리스 환경에 적합)
// 프로덕션에서는 Redis 권장
const adminSessions = new Map<string, AdminSession>();

/**
 * 관리자 로그인 및 토큰 발급
 */
export async function createAdminSession(
  password: string,
  ip?: string
): Promise<{
  success: boolean;
  token?: string;
  expiresIn?: number;
  error?: string;
}> {
  // 환경변수에서 관리자 비밀번호 가져오기
  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin1234';
  
  // 비밀번호 검증
  if (password !== ADMIN_PASSWORD) {
    // 로깅 (프로덕션에서 모니터링)
    console.warn(`[Admin Auth] Failed login attempt from IP: ${ip}`);
    return { 
      success: false, 
      error: '관리자 비밀번호가 올바르지 않습니다.' 
    };
  }
  
  // 토큰 생성 (32바이트 랜덤 + 타임스탬프 해시)
  const randomPart = randomBytes(32).toString('hex');
  const token = createHash('sha256')
    .update(`${randomPart}-${Date.now()}-${Math.random()}`)
    .digest('hex');
  
  // 세션 정보
  const now = Date.now();
  const expiresIn = 3600000; // 1시간
  const expiresAt = now + expiresIn;
  
  // 세션 저장
  adminSessions.set(token, {
    token,
    createdAt: now,
    expiresAt,
    ip
  });
  
  console.log(`[Admin Auth] New session created: ${token.substring(0, 8)}... (IP: ${ip})`);
  
  return { 
    success: true, 
    token,
    expiresIn 
  };
}

/**
 * 관리자 토큰 검증
 */
export function validateAdminToken(token: string): {
  valid: boolean;
  error?: string;
} {
  if (!token) {
    return { valid: false, error: '토큰이 제공되지 않았습니다.' };
  }
  
  const session = adminSessions.get(token);
  
  if (!session) {
    return { valid: false, error: '유효하지 않은 토큰입니다.' };
  }
  
  // 만료 확인
  const now = Date.now();
  if (now > session.expiresAt) {
    adminSessions.delete(token);
    return { valid: false, error: '토큰이 만료되었습니다.' };
  }
  
  return { valid: true };
}

/**
 * 관리자 로그아웃
 */
export function revokeAdminToken(token: string): boolean {
  if (adminSessions.has(token)) {
    adminSessions.delete(token);
    console.log(`[Admin Auth] Session revoked: ${token.substring(0, 8)}...`);
    return true;
  }
  return false;
}

/**
 * 모든 관리자 세션 로그아웃
 */
export function revokeAllAdminTokens(): number {
  const count = adminSessions.size;
  adminSessions.clear();
  console.log(`[Admin Auth] All sessions revoked (${count} sessions)`);
  return count;
}

/**
 * 만료된 세션 정리 (주기적 실행)
 */
export function cleanupExpiredSessions(): number {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [token, session] of adminSessions.entries()) {
    if (now > session.expiresAt) {
      adminSessions.delete(token);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`[Admin Auth] Cleaned up ${cleaned} expired sessions`);
  }
  
  return cleaned;
}

/**
 * 활성 세션 수 조회
 */
export function getActiveSessionCount(): number {
  // 만료된 세션 먼저 정리
  cleanupExpiredSessions();
  return adminSessions.size;
}

// 주기적으로 만료된 세션 정리 (1분마다)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cleanupExpiredSessions();
  }, 60000);
}

/**
 * Authorization 헤더에서 토큰 추출
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  
  // "Bearer <token>" 형식
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // 그냥 토큰만
  return authHeader;
}

/**
 * 개발 환경 전용: 테스트 토큰 생성
 */
export function createTestAdminToken(): string | null {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  const token = 'dev-admin-token-' + Date.now();
  adminSessions.set(token, {
    token,
    createdAt: Date.now(),
    expiresAt: Date.now() + 3600000,
    ip: 'localhost'
  });
  
  return token;
}
