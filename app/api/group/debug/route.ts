import { NextResponse } from 'next/server';
import { GroupService } from '@/lib/services/groupService';
import { MatchingService } from '@/lib/services/matchingService';

export async function GET() {
  try {
    const groupService = new GroupService();
    const matchingService = new MatchingService();

    // 모든 대기 중인 그룹 조회
    const waitingGroups = await groupService.getWaitingGroups();
    
    // 매칭 통계
    const stats = await matchingService.getMatchingStats();

    return NextResponse.json({
      success: true,
      data: {
        waitingGroupsCount: waitingGroups.length,
        waitingGroups: waitingGroups.map(g => ({
          id: g.id,
          leaderSessionId: g.leaderSessionId,
          tanks: g.tankCount,
          damage: g.damageCount,
          support: g.supportCount,
          total: g.totalMembers,
          status: g.status,
          createdAt: g.createdAt
        })),
        stats: stats
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
