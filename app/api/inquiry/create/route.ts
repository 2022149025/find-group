import { NextRequest, NextResponse } from 'next/server';
import { InquiryService } from '@/lib/services/inquiryService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, category, title, content } = body;

    console.log('[API /api/inquiry/create] 요청 받음:', {
      name,
      email,
      category,
      title
    });

    // 유효성 검사
    if (!name || !email || !category || !title || !content) {
      return NextResponse.json({
        success: false,
        error: '모든 필드를 입력해주세요.'
      }, { status: 400 });
    }

    // 이메일 형식 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        error: '올바른 이메일 형식이 아닙니다.'
      }, { status: 400 });
    }

    // 카테고리 검사
    const validCategories = ['bug', 'feature', 'suggestion', 'other'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({
        success: false,
        error: '올바른 문의 유형이 아닙니다.'
      }, { status: 400 });
    }

    const inquiryService = new InquiryService();
    const inquiry = await inquiryService.createInquiry({
      name,
      email,
      category,
      title,
      content
    });

    console.log('[API /api/inquiry/create] 문의 생성 성공:', inquiry.id);

    return NextResponse.json({
      success: true,
      data: inquiry,
      message: '문의가 성공적으로 접수되었습니다. 빠른 시일 내에 답변드리겠습니다.'
    }, { status: 201 });

  } catch (error: any) {
    console.error('[API /api/inquiry/create] 오류 발생:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '문의 접수 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}
