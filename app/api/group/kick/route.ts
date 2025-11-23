import { NextRequest, NextResponse } from 'next/server';
import { GroupService } from '@/lib/services/groupService';

export async function POST(request: NextRequest) {
  try {
    const { groupId, leaderSessionId, targetSessionId } = await request.json();

    if (!groupId || !leaderSessionId || !targetSessionId) {
      return NextResponse.json({
        success: false,
        error: 'groupId, leaderSessionId, and targetSessionId are required'
      }, { status: 400 });
    }

    const groupService = new GroupService();
    await groupService.kickMember(groupId, leaderSessionId, targetSessionId);

    return NextResponse.json({
      success: true,
      message: 'Member kicked successfully'
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 400 });
  }
}
