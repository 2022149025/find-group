import { NextResponse } from 'next/server';
import { GroupService } from '@/lib/services/groupService';
import { MatchingService } from '@/lib/services/matchingService';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  // 🔒 프로덕션 환경에서는 비활성화
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Not Found' },
      { status: 404 }
    );
  }
  
  try {
    console.log('[DEBUG API] 시작 (개발 환경 전용)');
    
    // 환경변수 확인
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('[DEBUG API] Supabase URL:', supabaseUrl?.substring(0, 30) + '...');
    console.log('[DEBUG API] Supabase Key exists:', !!supabaseKey);
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Supabase 환경변수가 설정되지 않았습니다',
        debug: {
          NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: !!supabaseKey
        }
      }, { status: 500 });
    }

    // 직접 Supabase 쿼리
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('[DEBUG API] 직접 쿼리 시작');
    const { data: rawGroups, error: rawError } = await supabase
      .from('groups')
      .select('*')
      .eq('status', 'waiting');
    
    console.log('[DEBUG API] 직접 쿼리 결과:', {
      count: rawGroups?.length || 0,
      error: rawError?.message || null
    });

    // 서비스를 통한 조회
    const groupService = new GroupService();
    const matchingService = new MatchingService();

    const waitingGroups = await groupService.getWaitingGroups();
    const stats = await matchingService.getMatchingStats();

    return NextResponse.json({
      success: true,
      data: {
        environment: {
          NEXT_PUBLIC_SUPABASE_URL: supabaseUrl?.substring(0, 30) + '...',
          hasKey: !!supabaseKey
        },
        rawQuery: {
          count: rawGroups?.length || 0,
          groups: rawGroups?.map(g => ({
            id: g.id.substring(0, 8) + '...',
            status: g.status,
            tanks: g.tank_count,
            damage: g.damage_count,
            support: g.support_count,
            total: g.total_members
          })) || [],
          error: rawError?.message || null
        },
        serviceQuery: {
          count: waitingGroups.length,
          groups: waitingGroups.map(g => ({
            id: g.id.substring(0, 8) + '...',
            leaderSessionId: g.leaderSessionId.substring(0, 15) + '...',
            tanks: g.tankCount,
            damage: g.damageCount,
            support: g.supportCount,
            total: g.totalMembers,
            status: g.status,
            createdAt: g.createdAt
          }))
        },
        stats: stats
      }
    });

  } catch (error: any) {
    console.error('[DEBUG API] 오류 발생:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
