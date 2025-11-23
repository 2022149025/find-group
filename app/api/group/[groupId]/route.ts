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
