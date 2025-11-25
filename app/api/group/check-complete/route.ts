import { NextRequest, NextResponse } from 'next/server';
import { GroupService } from '@/lib/services/groupService';

/**
 * 매칭 완료 강제 체크 API
 * 클라이언트에서 5명이 모였지만 매칭 완료가 되지 않을 때 호출
 */
export async function POST(request: NextRequest) {
  try {
    const { groupId } = await request.json();

    console.log(`[API /api/group/check-complete] 요청 받음 - groupId: ${groupId}`);

    if (!groupId) {
      return NextResponse.json({
        success: false,
        error: 'groupId is required'
      }, { status: 400 });
    }

    const groupService = new GroupService();
    
    // 그룹 상태 확인
    const { group, members } = await groupService.getGroupWithMembers(groupId);
    
    console.log(`[API /api/group/check-complete] 그룹 상태:`, {
      total_members: group.totalMembers,
      tank_count: group.tankCount,
      damage_count: group.damageCount,
      support_count: group.supportCount,
      status: group.status,
      members_count: members.length
    });

    // 이미 매칭 완료된 경우
    if (group.status === 'matched') {
      console.log(`[API /api/group/check-complete] 이미 매칭 완료됨`);
      return NextResponse.json({
        success: true,
        data: {
          matched: true,
          message: 'Already matched'
        }
      });
    }

    // 5명이 모였는지 확인
    if (members.length !== 5) {
      console.log(`[API /api/group/check-complete] 아직 5명이 아님: ${members.length}명`);
      return NextResponse.json({
        success: true,
        data: {
          matched: false,
          message: `Not enough members: ${members.length}/5`
        }
      });
    }

    console.log(`[API /api/group/check-complete] 5명 달성! 매칭 완료 처리 시작`);

    // 매칭 완료 처리 (Flex 자동 배정 포함)
    await groupService.forceCheckMatchingComplete(groupId);

    // 최신 상태 다시 조회
    const { group: updatedGroup } = await groupService.getGroupWithMembers(groupId);

    console.log(`[API /api/group/check-complete] 처리 후 상태: ${updatedGroup.status}`);

    return NextResponse.json({
      success: true,
      data: {
        matched: updatedGroup.status === 'matched',
        status: updatedGroup.status,
        message: updatedGroup.status === 'matched' ? 'Matching completed' : 'Processing...'
      }
    });

  } catch (error: any) {
    console.error(`[API /api/group/check-complete] 오류 발생:`, error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
