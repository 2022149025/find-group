import { createClient } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  session_id: string;
  nickname: string;
  battle_tag: string;
  main_position: 'Tank' | 'Damage' | 'Support';
  current_tier: {
    rank: string;
    division: number;
  };
  main_heroes: string[];
  introduction: string;
  created_at: string;
  expires_at: string;
}

export interface Group {
  id: string;
  leaderSessionId: string;
  tankCount: number;
  damageCount: number;
  supportCount: number;
  totalMembers: number;
  status: 'waiting' | 'matched';
  createdAt: string;
  matchedAt?: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  sessionId: string;
  position: 'Tank' | 'Damage' | 'Support';
  isLeader: boolean;
  joinedAt: string;
  profile?: Profile;
}

export class GroupService {
  private supabase;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    
    // 서버 사이드에서는 Service Role Key 사용 (RLS 우회)
    // 클라이언트 사이드에서는 Anon Key 사용 (보안)
    const isServer = typeof window === 'undefined';
    const supabaseKey = isServer && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? process.env.SUPABASE_SERVICE_ROLE_KEY
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    console.log('[GroupService] Supabase 초기화:', {
      isServer,
      url: supabaseUrl.substring(0, 30) + '...',
      keyType: isServer && process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon',
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * UC-210: 그룹장으로 그룹 생성
   */
  async createGroup(leaderSessionId: string, leaderPosition: 'Tank' | 'Damage' | 'Support'): Promise<Group> {
    console.log('[GroupService] 그룹 생성 시작:', { leaderSessionId, leaderPosition });
    
    // 그룹 생성
    const { data: groupData, error: groupError } = await this.supabase
      .from('groups')
      .insert({
        leader_session_id: leaderSessionId,
        tank_count: leaderPosition === 'Tank' ? 1 : 0,
        damage_count: leaderPosition === 'Damage' ? 1 : 0,
        support_count: leaderPosition === 'Support' ? 1 : 0,
        total_members: 1,
        status: 'waiting'
      })
      .select()
      .single();

    if (groupError) {
      console.error('[GroupService] 그룹 생성 실패:', groupError);
      throw new Error(`Failed to create group: ${groupError.message}`);
    }

    console.log('[GroupService] 그룹 생성 성공:', {
      id: groupData.id,
      status: groupData.status,
      position: leaderPosition
    });

    // 그룹장을 멤버로 추가
    const { error: memberError } = await this.supabase
      .from('group_members')
      .insert({
        group_id: groupData.id,
        session_id: leaderSessionId,
        position: leaderPosition,
        is_leader: true
      });

    if (memberError) {
      console.error('[GroupService] 멤버 추가 실패:', memberError);
      throw new Error(`Failed to add leader to group: ${memberError.message}`);
    }

    console.log('[GroupService] 그룹장 멤버 추가 성공');

    return this.mapGroupData(groupData);
  }

  /**
   * UC-220: 역할 검증 및 그룹 참가
   */
  async joinGroup(groupId: string, sessionId: string, position: 'Tank' | 'Damage' | 'Support'): Promise<GroupMember> {
    // 현재 그룹 상태 조회
    const { data: groupData, error: groupError } = await this.supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (groupError || !groupData) {
      throw new Error('Group not found');
    }

    // 역할 검증
    const canJoin = this.validateRoleCapacity(groupData, position);
    if (!canJoin) {
      throw new Error(`Cannot join: ${position} position is full`);
    }

    // 멤버 추가
    const { data: memberData, error: memberError } = await this.supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        session_id: sessionId,
        position: position,
        is_leader: false
      })
      .select()
      .single();

    if (memberError) throw new Error(`Failed to join group: ${memberError.message}`);

    // 그룹 카운트 업데이트
    await this.updateGroupCounts(groupId, position, 'increment');

    // UC-301: 매칭 완료 감지
    await this.checkMatchingComplete(groupId);

    return this.mapMemberData(memberData);
  }

  /**
   * UC-231: 그룹원 강제 퇴장
   */
  async kickMember(groupId: string, leaderSessionId: string, targetSessionId: string): Promise<void> {
    // 그룹장 권한 확인
    const { data: groupData } = await this.supabase
      .from('groups')
      .select('leader_session_id')
      .eq('id', groupId)
      .single();

    if (!groupData || groupData.leader_session_id !== leaderSessionId) {
      throw new Error('Only group leader can kick members');
    }

    // 대상 멤버 조회
    const { data: memberData } = await this.supabase
      .from('group_members')
      .select('position, is_leader')
      .eq('group_id', groupId)
      .eq('session_id', targetSessionId)
      .single();

    if (!memberData) {
      throw new Error('Member not found');
    }

    if (memberData.is_leader) {
      throw new Error('Cannot kick group leader');
    }

    // 멤버 삭제
    const { error: deleteError } = await this.supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('session_id', targetSessionId);

    if (deleteError) throw new Error(`Failed to kick member: ${deleteError.message}`);

    // 그룹 카운트 업데이트
    await this.updateGroupCounts(groupId, memberData.position, 'decrement');
  }

  /**
   * 그룹 정보 조회 (멤버 포함)
   */
  async getGroupWithMembers(groupId: string): Promise<{ group: Group; members: GroupMember[] }> {
    const { data: groupData, error: groupError } = await this.supabase
      .from('groups')
      .select(`
        *,
        group_members (
          *,
          temporary_profiles (*)
        )
      `)
      .eq('id', groupId)
      .single();

    if (groupError || !groupData) {
      throw new Error('Group not found');
    }

    const group = this.mapGroupData(groupData);
    const members = (groupData.group_members || []).map((m: any) => {
      const memberData = this.mapMemberData(m);
      // Supabase JOIN으로 가져온 profile 데이터 매핑
      if (m.temporary_profiles) {
        memberData.profile = m.temporary_profiles;
      }
      return memberData;
    });

    return { group, members };
  }

  /**
   * 역할 용량 검증
   */
  private validateRoleCapacity(groupData: any, position: 'Tank' | 'Damage' | 'Support'): boolean {
    switch (position) {
      case 'Tank':
        return groupData.tank_count < 1;
      case 'Damage':
        return groupData.damage_count < 2;
      case 'Support':
        return groupData.support_count < 2;
      default:
        return false;
    }
  }

  /**
   * 그룹 카운트 업데이트
   */
  private async updateGroupCounts(groupId: string, position: 'Tank' | 'Damage' | 'Support', operation: 'increment' | 'decrement'): Promise<void> {
    const { data: currentGroup } = await this.supabase
      .from('groups')
      .select('tank_count, damage_count, support_count, total_members')
      .eq('id', groupId)
      .single();

    if (!currentGroup) throw new Error('Group not found');

    const delta = operation === 'increment' ? 1 : -1;
    const updates: any = {
      total_members: currentGroup.total_members + delta
    };

    switch (position) {
      case 'Tank':
        updates.tank_count = currentGroup.tank_count + delta;
        break;
      case 'Damage':
        updates.damage_count = currentGroup.damage_count + delta;
        break;
      case 'Support':
        updates.support_count = currentGroup.support_count + delta;
        break;
    }

    const { error } = await this.supabase
      .from('groups')
      .update(updates)
      .eq('id', groupId);

    if (error) throw new Error(`Failed to update group counts: ${error.message}`);
  }

  /**
   * UC-301: 매칭 완료 감지 (1T-2D-2H)
   */
  private async checkMatchingComplete(groupId: string): Promise<void> {
    const { data: groupData } = await this.supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (!groupData) return;

    const isComplete = 
      groupData.tank_count === 1 &&
      groupData.damage_count === 2 &&
      groupData.support_count === 2 &&
      groupData.total_members === 5;

    if (isComplete && groupData.status === 'waiting') {
      await this.supabase
        .from('groups')
        .update({
          status: 'matched',
          matched_at: new Date().toISOString()
        })
        .eq('id', groupId);
    }
  }

  /**
   * 대기 중인 그룹 조회
   */
  async getWaitingGroups(): Promise<Group[]> {
    console.log('[GroupService] getWaitingGroups 시작');
    console.log('[GroupService] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...');
    
    const { data, error } = await this.supabase
      .from('groups')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[GroupService] 쿼리 오류:', error);
      throw new Error(`Failed to fetch waiting groups: ${error.message}`);
    }

    console.log('[GroupService] 조회된 그룹 수:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('[GroupService] 그룹 상세:', data.map(g => ({
        id: g.id.substring(0, 8),
        status: g.status,
        tanks: g.tank_count,
        damage: g.damage_count,
        support: g.support_count
      })));
    }

    return (data || []).map(this.mapGroupData);
  }

  /**
   * 그룹원 탈퇴 (자발적 탈퇴)
   */
  async removeMember(groupId: string, sessionId: string): Promise<void> {
    // 멤버 정보 조회
    const { data: memberData } = await this.supabase
      .from('group_members')
      .select('position, is_leader')
      .eq('group_id', groupId)
      .eq('session_id', sessionId)
      .single();

    if (!memberData) {
      throw new Error('Member not found');
    }

    if (memberData.is_leader) {
      throw new Error('Leader cannot leave. Use deleteGroup instead.');
    }

    // 멤버 삭제
    const { error: deleteError } = await this.supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('session_id', sessionId);

    if (deleteError) throw new Error(`Failed to remove member: ${deleteError.message}`);

    // 그룹 카운트 업데이트
    await this.updateGroupCounts(groupId, memberData.position, 'decrement');
  }

  /**
   * 그룹장 인계 (그룹장이 나가면 다음 멤버에게 인계)
   */
  async transferLeadership(groupId: string, currentLeaderSessionId: string): Promise<void> {
    // 현재 그룹의 모든 멤버 조회 (그룹장 제외, 가입 순서대로)
    const { data: members } = await this.supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('is_leader', false)
      .order('joined_at', { ascending: true });

    if (!members || members.length === 0) {
      // 멤버가 없으면 그룹 삭제
      await this.deleteGroup(groupId);
      return;
    }

    // 가장 먼저 들어온 멤버를 새 그룹장으로 지정
    const newLeader = members[0];

    // 새 그룹장 업데이트
    const { error: updateMemberError } = await this.supabase
      .from('group_members')
      .update({ is_leader: true })
      .eq('id', newLeader.id);

    if (updateMemberError) throw new Error(`Failed to update new leader: ${updateMemberError.message}`);

    // 그룹의 leader_session_id 업데이트
    const { error: updateGroupError } = await this.supabase
      .from('groups')
      .update({ leader_session_id: newLeader.session_id })
      .eq('id', groupId);

    if (updateGroupError) throw new Error(`Failed to update group leader: ${updateGroupError.message}`);

    // 기존 그룹장 멤버 삭제
    const { data: oldLeaderMember } = await this.supabase
      .from('group_members')
      .select('position')
      .eq('group_id', groupId)
      .eq('session_id', currentLeaderSessionId)
      .single();

    if (oldLeaderMember) {
      await this.supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('session_id', currentLeaderSessionId);

      // 카운트 업데이트
      await this.updateGroupCounts(groupId, oldLeaderMember.position, 'decrement');
    }
  }

  /**
   * 그룹 삭제 (멤버가 없을 때만 삭제)
   */
  async deleteGroup(groupId: string): Promise<void> {
    // group_members는 ON DELETE CASCADE로 자동 삭제됨
    const { error } = await this.supabase
      .from('groups')
      .delete()
      .eq('id', groupId);

    if (error) throw new Error(`Failed to delete group: ${error.message}`);
  }

  private mapGroupData(data: any): Group {
    return {
      id: data.id,
      leaderSessionId: data.leader_session_id,
      tankCount: data.tank_count,
      damageCount: data.damage_count,
      supportCount: data.support_count,
      totalMembers: data.total_members,
      status: data.status,
      createdAt: data.created_at,
      matchedAt: data.matched_at
    };
  }

  private mapMemberData(data: any): GroupMember {
    return {
      id: data.id,
      groupId: data.group_id,
      sessionId: data.session_id,
      position: data.position,
      isLeader: data.is_leader,
      joinedAt: data.joined_at
    };
  }
}
