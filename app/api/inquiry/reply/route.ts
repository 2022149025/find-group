import { NextRequest, NextResponse } from 'next/server';
import { InquiryService } from '@/lib/services/inquiryService';

/**
 * 관리자 답변 작성
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inquiryId, adminReply } = body;

    console.log('[API /api/inquiry/reply] 요청 받음:', {
      inquiryId,
      replyLength: adminReply?.length
    });

    // 유효성 검사
    if (!inquiryId || !adminReply) {
      return NextResponse.json({
        success: false,
        error: '문의 ID와 답변 내용을 입력해주세요.'
      }, { status: 400 });
    }

    if (adminReply.trim().length < 10) {
      return NextResponse.json({
        success: false,
        error: '답변은 최소 10자 이상 입력해주세요.'
      }, { status: 400 });
    }

    const inquiryService = new InquiryService();
    const updatedInquiry = await inquiryService.replyToInquiry(inquiryId, adminReply);

    console.log('[API /api/inquiry/reply] 답변 작성 성공:', updatedInquiry.id);

    return NextResponse.json({
      success: true,
      data: updatedInquiry,
      message: '답변이 성공적으로 등록되었습니다.'
    }, { status: 200 });

  } catch (error: any) {
    console.error('[API /api/inquiry/reply] 오류 발생:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '답변 등록 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}
