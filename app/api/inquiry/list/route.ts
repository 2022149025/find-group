import { NextRequest, NextResponse } from 'next/server';
import { InquiryService } from '@/lib/services/inquiryService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    console.log('[API /api/inquiry/list] 요청 받음:', { email });

    if (!email) {
      return NextResponse.json({
        success: false,
        error: '이메일을 입력해주세요.'
      }, { status: 400 });
    }

    const inquiryService = new InquiryService();
    const inquiries = await inquiryService.getInquiriesByEmail(email);

    console.log('[API /api/inquiry/list] 문의 조회 성공:', inquiries.length, '개');

    return NextResponse.json({
      success: true,
      data: inquiries
    }, { status: 200 });

  } catch (error: any) {
    console.error('[API /api/inquiry/list] 오류 발생:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '문의 목록 조회 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}
