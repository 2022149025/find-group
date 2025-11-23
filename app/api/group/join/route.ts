import { NextRequest, NextResponse } from 'next/server';
import { MatchingService } from '@/lib/services/matchingService';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, position } = await request.json();

    console.log(`[API /api/group/join] 요청 받음 - sessionId: ${sessionId}, position: ${position}`);

    if (!sessionId || !position) {
      return NextResponse.json({
        success: false,
        error: 'sessionId and position are required'
      }, { status: 400 });
    }

    const matchingService = new MatchingService();
    
    // 매칭 통계 먼저 확인
    const stats = await matchingService.getMatchingStats();
    console.log(`[API /api/group/join] 매칭 통계:`, stats);

    const result = await matchingService.autoMatchGroup(sessionId, position);

    if (!result.joined) {
      console.log(`[API /api/group/join] 매칭 실패 - 대기 중인 그룹: ${stats.totalWaitingGroups}개`);
      
      return NextResponse.json({
        success: false,
        error: 'No suitable group found. Please try again or create a new group.',
        debug: {
          waitingGroups: stats.totalWaitingGroups,
          position: position,
          stats: stats
        }
      }, { status: 404 });
    }

    console.log(`[API /api/group/join] 매칭 성공 - groupId: ${result.groupId}`);

    return NextResponse.json({
      success: true,
      data: result
    }, { status: 200 });

  } catch (error: any) {
    console.error(`[API /api/group/join] 오류 발생:`, error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 400 });
  }
}
