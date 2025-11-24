import { NextRequest, NextResponse } from 'next/server';
import { GroupService } from '@/lib/services/groupService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const groupService = new GroupService();
    const result = await groupService.getGroupWithMembers(groupId);

    // 멤버 프로필 데이터 로깅
    console.log('[API /group/[groupId]] Group fetched:', groupId);
    console.log('[API /group/[groupId]] Members count:', result.members.length);
    result.members.forEach((m, idx) => {
      console.log(`[API /group/[groupId]] Member ${idx + 1} profile:`, JSON.stringify({
        hasProfile: !!m.profile,
        nickname: m.profile?.nickname,
        tier: m.profile?.current_tier,
        heroes: m.profile?.main_heroes
      }));
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 404 });
  }
}
