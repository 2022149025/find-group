import { NextRequest, NextResponse } from 'next/server';
import { GroupService } from '@/lib/services/groupService';

export async function POST(request: NextRequest) {
  try {
    const { groupId, sessionId } = await request.json();

    if (!groupId || !sessionId) {
      return NextResponse.json({
        success: false,
        error: 'groupId and sessionId are required'
      }, { status: 400 });
    }

    const groupService = new GroupService();
    
    // 멤버 조회
    const { members } = await groupService.getGroupWithMembers(groupId);
    const member = members.find(m => m.sessionId === sessionId);

    if (!member) {
      return NextResponse.json({
        success: false,
        error: 'Member not found in group'
      }, { status: 404 });
    }

    // 그룹장인 경우 그룹 전체 삭제
    if (member.isLeader) {
      await groupService.deleteGroup(groupId);
      return NextResponse.json({
        success: true,
        message: 'Group deleted (leader left)'
      });
    }

    // 일반 멤버인 경우 탈퇴 처리
    await groupService.removeMember(groupId, sessionId);

    return NextResponse.json({
      success: true,
      message: 'Member left successfully'
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 400 });
  }
}
