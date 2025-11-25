import { NextRequest, NextResponse } from 'next/server';
import { revokeAdminToken, extractTokenFromHeader } from '@/lib/security/adminAuth';
import { logApiRequest, logApiError } from '@/lib/security/errorHandler';

/**
 * 관리자 로그아웃 API
 * POST /api/auth/admin/logout
 */
export async function POST(request: NextRequest) {
  const endpoint = '/api/auth/admin/logout';
  
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    
    logApiRequest('POST', endpoint, { hasToken: !!token });
    
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: '토큰이 제공되지 않았습니다.'
        },
        { status: 400 }
      );
    }
    
    // 토큰 무효화
    const revoked = revokeAdminToken(token);
    
    return NextResponse.json(
      {
        success: true,
        message: revoked ? '로그아웃되었습니다.' : '이미 로그아웃된 세션입니다.'
      },
      { status: 200 }
    );
    
  } catch (error: any) {
    logApiError('POST', endpoint, error);
    return NextResponse.json(
      {
        success: false,
        error: '로그아웃 중 오류가 발생했습니다.'
      },
      { status: 500 }
    );
  }
}
