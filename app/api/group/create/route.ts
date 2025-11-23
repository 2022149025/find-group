import { NextRequest, NextResponse } from 'next/server';
import { GroupService } from '@/lib/services/groupService';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, position } = await request.json();

    if (!sessionId || !position) {
      return NextResponse.json({
        success: false,
        error: 'sessionId and position are required'
      }, { status: 400 });
    }

    const groupService = new GroupService();
    const group = await groupService.createGroup(sessionId, position);

    return NextResponse.json({
      success: true,
      data: group
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 400 });
  }
}
