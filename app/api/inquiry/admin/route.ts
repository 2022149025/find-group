import { NextRequest, NextResponse } from 'next/server';
import { InquiryService } from '@/lib/services/inquiryService';

/**
 * 관리자용 전체 문의 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
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
    console.error('[API /api/inquiry/admin] 오류 발생:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '문의 목록 조회 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}
