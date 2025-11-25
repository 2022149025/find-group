import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware - API 경로 인증/권한 체크
 * 
 * 🔒 보안 원칙:
 * - /api/* 경로에 대한 일관된 보안 체크
 * - 인증 필요 여부 확인
 * - 권한 검증
 * - Rate Limiting (API별 구현)
 */

// 인증이 필요한 API 경로
const PROTECTED_ROUTES = [
  '/api/inquiry/admin',
  '/api/inquiry/reply',
  '/api/auth/admin/logout',
];

// 공개 API 경로 (인증 불필요)
const PUBLIC_ROUTES = [
  '/api/profile/create',
  '/api/group/create',
  '/api/group/join',
  '/api/group/leave',
  '/api/group/kick',
  '/api/group/check-complete',
  '/api/inquiry/create',
  '/api/inquiry/list',
  '/api/auth/admin/login',
];

// DEBUG API (프로덕션에서 차단)
const DEBUG_ROUTES = [
  '/api/group/debug',
  '/api/env-check',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // API 경로가 아니면 통과
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  // 1. DEBUG API 프로덕션 차단
  if (process.env.NODE_ENV === 'production') {
    for (const route of DEBUG_ROUTES) {
      if (pathname.startsWith(route)) {
        return NextResponse.json(
          { success: false, error: 'Not Found' },
          { status: 404 }
        );
      }
    }
  }
  
  // 2. 보호된 API 경로 체크
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  
  if (isProtectedRoute) {
    // Authorization 헤더 확인
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }
    
    // CSRF 토큰 확인 (쿠키와 헤더 모두 필요)
    const csrfHeader = request.headers.get('x-csrf-token');
    const csrfCookie = request.cookies.get('csrf-token');
    
    if (!csrfHeader || !csrfCookie) {
      return NextResponse.json(
        { success: false, error: 'CSRF 토큰이 필요합니다.' },
        { status: 403 }
      );
    }
  }
  
  // 3. Origin/Referer 검증 (모든 변경 API)
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const host = request.headers.get('host');
    
    // 개발 환경은 localhost 허용
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isLocalhost = origin?.includes('localhost') || referer?.includes('localhost');
    
    if (!isDevelopment && !isLocalhost) {
      const allowedOrigins = [
        `https://${host}`,
        'https://find-group.vercel.app',
      ];
      
      // Origin 또는 Referer 중 하나는 있어야 함
      if (origin && !allowedOrigins.some(allowed => origin === allowed || origin.startsWith(allowed))) {
        console.warn(`[Middleware] Blocked request from origin: ${origin}`);
        return NextResponse.json(
          { success: false, error: 'Invalid origin' },
          { status: 403 }
        );
      }
      
      if (referer && !referer.includes(host || '')) {
        console.warn(`[Middleware] Blocked request from referer: ${referer}`);
        return NextResponse.json(
          { success: false, error: 'Invalid referer' },
          { status: 403 }
        );
      }
    }
  }
  
  // 4. 보안 헤더 추가
  const response = NextResponse.next();
  
  // API 응답에도 보안 헤더 추가
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  return response;
}

// Middleware가 실행될 경로 설정
export const config = {
  matcher: [
    '/api/:path*',  // 모든 API 경로
  ],
};
