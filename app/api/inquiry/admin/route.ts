import { NextRequest, NextResponse } from 'next/server';
import { InquiryService } from '@/lib/services/inquiryService';
import { validateAdminToken, extractTokenFromHeader } from '@/lib/security/adminAuth';
import { logApiRequest, logApiError } from '@/lib/security/errorHandler';

/**
 * 관리자용 전체 문의 목록 조회
 * 🔒 인증 필수: Bearer 토큰
 */
export async function GET(request: NextRequest) {
  const endpoint = '/api/inquiry/admin';
  
  try {
    // 1. 토큰 검증
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }
    
    const validation = validateAdminToken(token);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 401 }
      );
    }
    
    logApiRequest('GET', endpoint, { authenticated: true });
    // 2. 데이터 조회
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'pending' | 'answered' | null (전체)

    console.log('[API /api/inquiry/admin] 요청 받음:', { status });

    const inquiryService = new InquiryService();
    const inquiries = await inquiryService.getAllInquiries(status as 'pending' | 'answered' | null);

    console.log('[API /api/inquiry/admin] 문의 조회 성공:', inquiries.length, '개');

    return NextResponse.json({
      success: true,
      data: inquiries
    }, { status: 200 });

  } catch (error: any) {
    logApiError('GET', endpoint, error);
    console.error('[API /api/inquiry/admin] 오류 발생:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '문의 목록 조회 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}
