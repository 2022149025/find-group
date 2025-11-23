import { NextRequest, NextResponse } from 'next/server';
import { MatchingService } from '@/lib/services/matchingService';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, position } = await request.json();

    if (!sessionId || !position) {
      return NextResponse.json({
        success: false,
        error: 'sessionId and position are required'
      }, { status: 400 });
    }

    const matchingService = new MatchingService();
    const result = await matchingService.autoMatchGroup(sessionId, position);

    if (!result.joined) {
      return NextResponse.json({
        success: false,
        error: 'No suitable group found. Please try again or create a new group.'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 400 });
  }
}
