import { createClient } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  session_id: string;
  nickname: string;
  battle_tag: string;
  main_position: 'Tank' | 'Damage' | 'Support';
  current_tier: {
    Tank?: string;
    Damage?: string;
    Support?: string;
  } | {
    rank: string;
    division: number;
  };
  main_heroes: string[] | {
    Tank?: string[];
    Damage?: string[];
    Support?: string[];
  };
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
  position: 'Tank' | 'Damage' | 'Support' | 'Flex';
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
  async createGroup(leaderSessionId: string, leaderPosition: 'Tank' | 'Damage' | 'Support' | 'Flex'): Promise<Group> {
    console.log('[GroupService] 그룹 생성 시작:', { leaderSessionId, leaderPosition });
    
    // Flex는 포지션 카운트를 증가시키지 않음 (나중에 자동 배정)
    const isFlex = leaderPosition === 'Flex';
    
    console.log('[GroupService] Flex 여부:', isFlex);
    
    // 그룹 생성
    const { data: groupData, error: groupError } = await this.supabase
      .from('groups')
      .insert({
        leader_session_id: leaderSessionId,
        tank_count: !isFlex && leaderPosition === 'Tank' ? 1 : 0,
        damage_count: !isFlex && leaderPosition === 'Damage' ? 1 : 0,
        support_count: !isFlex && leaderPosition === 'Support' ? 1 : 0,
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

    // 그룹장을 멤버로 추가 (Flex는 Flex로 저장)
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
   * UC-220: 역할 검증 및 그룹 참가 (트랜잭션 기반 - 동시성 처리)
   */
  async joinGroup(groupId: string, sessionId: string, position: 'Tank' | 'Damage' | 'Support'): Promise<GroupMember> {
    console.log(`[joinGroup] 시작 - groupId: ${groupId}, position: ${position}`);

    // 멤버 추가 시도
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

    if (memberError) {
      console.error(`[joinGroup] 멤버 추가 실패:`, memberError);
      throw new Error(`Failed to join group: ${memberError.message}`);
    }

    console.log(`[joinGroup] 멤버 추가 성공, 카운트 업데이트 시작`);

    // 그룹 카운트 업데이트 (낙관적 동시성 제어)
    try {
      const { data: currentGroup } = await this.supabase
        .from('groups')
        .select('tank_count, damage_count, support_count, total_members')
        .eq('id', groupId)
        .single();

      if (!currentGroup) {
        // 롤백: 방금 추가한 멤버 삭제
        await this.supabase.from('group_members').delete().eq('id', memberData.id);
        throw new Error('Group not found after member insert');
      }

      // 포지션별 카운트 검증
      let isValid = true;
      switch (position) {
        case 'Tank':
          isValid = currentGroup.tank_count < 1;
          break;
        case 'Damage':
          isValid = currentGroup.damage_count < 2;
          break;
        case 'Support':
          isValid = currentGroup.support_count < 2;
          break;
      }

      if (!isValid) {
        console.error(`[joinGroup] 포지션 초과 - ${position} 슬롯이 이미 꽉 참`);
        // 롤백: 방금 추가한 멤버 삭제
        await this.supabase.from('group_members').delete().eq('id', memberData.id);
        throw new Error(`Position ${position} is already full`);
      }

      // 카운트 업데이트
      await this.updateGroupCounts(groupId, position, 'increment');
      console.log(`[joinGroup] 카운트 업데이트 완료`);

    } catch (updateError: any) {
      console.error(`[joinGroup] 카운트 업데이트 중 오류:`, updateError);
      throw updateError; // 에러를 상위로 전파
    }

    // UC-301: 매칭 완료 감지
    await this.checkMatchingComplete(groupId);

    return this.mapMemberData(memberData);
  }

  /**
   * Flex 포지션으로 그룹 참가 (트랜잭션 기반)
   */
  async joinGroupAsFlex(groupId: string, sessionId: string): Promise<GroupMember> {
    console.log(`[joinGroupAsFlex] 시작 - groupId: ${groupId}`);

    // 멤버 추가 시도
    const { data: memberData, error: memberError } = await this.supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        session_id: sessionId,
        position: 'Flex',
        is_leader: false
      })
      .select()
      .single();

    if (memberError) {
      console.error(`[joinGroupAsFlex] 멤버 추가 실패:`, memberError);
      throw new Error(`Failed to join group as Flex: ${memberError.message}`);
    }

    console.log(`[joinGroupAsFlex] 멤버 추가 성공`);

    // 총 멤버 수 증가 (낙관적 동시성 제어)
    try {
      const { data: currentGroup } = await this.supabase
        .from('groups')
        .select('total_members')
        .eq('id', groupId)
        .single();

      if (!currentGroup) {
        // 롤백
        await this.supabase.from('group_members').delete().eq('id', memberData.id);
        throw new Error('Group not found after member insert');
      }

      // 5명 초과 검증
      if (currentGroup.total_members >= 5) {
        console.error(`[joinGroupAsFlex] 그룹이 이미 꽉 참`);
        // 롤백
        await this.supabase.from('group_members').delete().eq('id', memberData.id);
        throw new Error('Group is already full');
      }

      // 총 멤버 수 증가
      await this.supabase
        .from('groups')
        .update({ total_members: currentGroup.total_members + 1 })
        .eq('id', groupId);

      console.log(`[joinGroupAsFlex] 멤버 수 업데이트 완료: ${currentGroup.total_members + 1}`);

    } catch (updateError: any) {
      console.error(`[joinGroupAsFlex] 업데이트 중 오류:`, updateError);
      throw updateError; // 에러를 상위로 전파
    }

    // UC-301: 매칭 완료 감지 (5명이면 Flex 자동 배정)
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
   * UC-301: 매칭 완료 감지 (1T-2D-2H) + Flex 자동 배정
   */
  private async checkMatchingComplete(groupId: string): Promise<void> {
    console.log('[checkMatchingComplete] ========== 시작 ==========');
    
    const { data: groupData } = await this.supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (!groupData) {
      console.log('[checkMatchingComplete] ❌ Group not found');
      return;
    }

    console.log('[checkMatchingComplete] 현재 그룹 상태:', {
      groupId: groupId.substring(0, 8) + '...',
      total_members: groupData.total_members,
      tank_count: groupData.tank_count,
      damage_count: groupData.damage_count,
      support_count: groupData.support_count,
      status: groupData.status
    });

    // 이미 매칭 완료된 경우 스킵
    if (groupData.status === 'matched') {
      console.log('[checkMatchingComplete] ⏭️ 이미 매칭 완료됨, 스킵');
      return;
    }

    // 5명이 아니면 스킵
    if (groupData.total_members !== 5) {
      console.log('[checkMatchingComplete] ⏭️ 5명 미달:', groupData.total_members, '명');
      return;
    }

    console.log('[checkMatchingComplete] ✅ 5명 달성! 포지션 확인 중...');

    // 현재 그룹의 모든 멤버 조회
    const { data: members } = await this.supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId);

    if (!members || members.length !== 5) {
      console.log('[checkMatchingComplete] ❌ 멤버 조회 실패 또는 5명 아님:', members?.length);
      return;
    }

    console.log('[checkMatchingComplete] 멤버 포지션:', members.map(m => m.position));

    // Flex 멤버 찾기
    const flexMembers = members.filter(m => m.position === 'Flex');
    
    if (flexMembers.length > 0) {
      console.log('[checkMatchingComplete] 🔄 Flex 멤버 발견:', flexMembers.length, '명 → 자동 배정 시작');

      // 필요한 포지션 계산 (1T-2D-2S 기준)
      const tankNeeded = 1 - groupData.tank_count;
      const damageNeeded = 2 - groupData.damage_count;
      const supportNeeded = 2 - groupData.support_count;

      console.log('[checkMatchingComplete] 필요한 포지션:', {
        Tank: tankNeeded,
        Damage: damageNeeded,
        Support: supportNeeded,
        total: tankNeeded + damageNeeded + supportNeeded
      });

      // 필요한 포지션이 Flex 멤버 수와 일치하는지 확인
      const totalNeeded = tankNeeded + damageNeeded + supportNeeded;
      if (totalNeeded !== flexMembers.length) {
        console.error('[checkMatchingComplete] ❌ 포지션 수 불일치!', {
          flexMembers: flexMembers.length,
          needed: totalNeeded
        });
        return;
      }

      // 필요한 포지션 배열 생성
      const neededPositions: ('Tank' | 'Damage' | 'Support')[] = [];
      for (let i = 0; i < tankNeeded; i++) neededPositions.push('Tank');
      for (let i = 0; i < damageNeeded; i++) neededPositions.push('Damage');
      for (let i = 0; i < supportNeeded; i++) neededPositions.push('Support');

      console.log('[checkMatchingComplete] 배정할 포지션 순서:', neededPositions);

      // Flex 멤버를 랜덤하게 배정
      const shuffledFlex = [...flexMembers].sort(() => Math.random() - 0.5);
      
      // 모든 Flex 멤버를 한 번에 배정
      const assignmentPromises = shuffledFlex.map(async (member, index) => {
        if (index >= neededPositions.length) {
          console.error('[checkMatchingComplete] ⚠️ 인덱스 초과:', index);
          return;
        }

        const assignedPosition = neededPositions[index];

        console.log('[checkMatchingComplete] 배정:', {
          member_id: member.id.substring(0, 8) + '...',
          Flex: '→',
          position: assignedPosition
        });

        // 멤버 포지션 업데이트
        await this.supabase
          .from('group_members')
          .update({ position: assignedPosition })
          .eq('id', member.id);

        return assignedPosition;
      });

      const assignedPositions = await Promise.all(assignmentPromises);
      
      console.log('[checkMatchingComplete] 모든 Flex 멤버 배정 완료:', assignedPositions);

      // 포지션 카운트를 한 번에 계산
      const finalTankCount = groupData.tank_count + assignedPositions.filter(p => p === 'Tank').length;
      const finalDamageCount = groupData.damage_count + assignedPositions.filter(p => p === 'Damage').length;
      const finalSupportCount = groupData.support_count + assignedPositions.filter(p => p === 'Support').length;

      console.log('[checkMatchingComplete] 최종 포지션 카운트:', {
        Tank: finalTankCount,
        Damage: finalDamageCount,
        Support: finalSupportCount
      });

      // 그룹 포지션 카운트 업데이트
      await this.supabase
        .from('groups')
        .update({
          tank_count: finalTankCount,
          damage_count: finalDamageCount,
          support_count: finalSupportCount
        })
        .eq('id', groupId);

      console.log('[checkMatchingComplete] 그룹 카운트 업데이트 완료');

      // 매칭 완료 확인 (1T-2D-2S)
      const isComplete = finalTankCount === 1 && finalDamageCount === 2 && finalSupportCount === 2;

      console.log('[checkMatchingComplete] 매칭 완료 체크:', {
        isComplete,
        composition: `${finalTankCount}T-${finalDamageCount}D-${finalSupportCount}S`
      });

      if (isComplete) {
        console.log('[checkMatchingComplete] 🎉 매칭 완료! 상태 업데이트 중...');
        const { error: statusError } = await this.supabase
          .from('groups')
          .update({
            status: 'matched',
            matched_at: new Date().toISOString()
          })
          .eq('id', groupId);

        if (statusError) {
          console.error('[checkMatchingComplete] ❌ 상태 업데이트 실패:', statusError);
        } else {
          console.log('[checkMatchingComplete] ✅ 매칭 완료 상태 업데이트 성공!');
        }
      } else {
        console.error('[checkMatchingComplete] ❌ 포지션 구성이 1T-2D-2S가 아님!');
      }
    } else {
      // Flex 멤버 없음 - 일반 매칭 체크
      console.log('[checkMatchingComplete] Flex 멤버 없음, 일반 매칭 체크');
      
      const isComplete = 
        groupData.tank_count === 1 &&
        groupData.damage_count === 2 &&
        groupData.support_count === 2;

      console.log('[checkMatchingComplete] 매칭 완료 체크 (Flex 없음):', {
        isComplete,
        composition: `${groupData.tank_count}T-${groupData.damage_count}D-${groupData.support_count}S`
      });

      if (isComplete) {
        console.log('[checkMatchingComplete] 🎉 매칭 완료! 상태 업데이트 중...');
        await this.supabase
          .from('groups')
          .update({
            status: 'matched',
            matched_at: new Date().toISOString()
          })
          .eq('id', groupId);
        console.log('[checkMatchingComplete] ✅ 매칭 완료!');
      }
    }

    console.log('[checkMatchingComplete] ========== 종료 ==========');
  }

  /**
   * 강제로 매칭 완료 체크 (외부에서 호출 가능)
   */
  async forceCheckMatchingComplete(groupId: string): Promise<void> {
    console.log('[forceCheckMatchingComplete] 강제 체크 시작:', groupId);
    await this.checkMatchingComplete(groupId);
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

  /**
   * 멤버 탈퇴 처리
   */
  async removeMember(groupId: string, sessionId: string): Promise<void> {
    console.log('[GroupService] 멤버 탈퇴 시작:', { groupId, sessionId });

    // 멤버 정보 조회
    const { data: memberData, error: memberError } = await this.supabase
      .from('group_members')
      .select('position, is_leader')
      .eq('group_id', groupId)
      .eq('session_id', sessionId)
      .single();

    if (memberError || !memberData) {
      console.error('[GroupService] 멤버를 찾을 수 없음:', memberError);
      throw new Error('Member not found');
    }

    console.log('[GroupService] 탈퇴할 멤버:', memberData);

    // 멤버 삭제
    const { error: deleteError } = await this.supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('session_id', sessionId);

    if (deleteError) {
      console.error('[GroupService] 멤버 삭제 실패:', deleteError);
      throw new Error(`Failed to remove member: ${deleteError.message}`);
    }

    console.log('[GroupService] 멤버 삭제 완료');

    // Flex가 아닌 경우에만 포지션 카운트 감소
    if (memberData.position !== 'Flex') {
      await this.updateGroupCounts(groupId, memberData.position as 'Tank' | 'Damage' | 'Support', 'decrement');
    } else {
      // Flex인 경우 총 멤버 수만 감소
      const { data: groupData } = await this.supabase
        .from('groups')
        .select('total_members')
        .eq('id', groupId)
        .single();

      if (groupData) {
        await this.supabase
          .from('groups')
          .update({ total_members: groupData.total_members - 1 })
          .eq('id', groupId);
      }
    }

    console.log('[GroupService] 멤버 탈퇴 처리 완료');

    // 남은 멤버 확인 후 그룹 삭제 여부 결정
    await this.checkAndDeleteEmptyGroup(groupId);
  }

  /**
   * 그룹장 권한 이양 (그룹장이 나가는 경우)
   */
  async transferLeadership(groupId: string, leaderSessionId: string): Promise<void> {
    console.log('[GroupService] 그룹장 권한 이양 시작:', { groupId, leaderSessionId });

    // 현재 그룹의 모든 멤버 조회
    const { data: members, error: membersError } = await this.supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId);

    if (membersError) {
      console.error('[GroupService] 멤버 조회 실패:', membersError);
      throw new Error(`Failed to get members: ${membersError.message}`);
    }

    console.log('[GroupService] 현재 멤버 수:', members?.length || 0);

    // 그룹장만 있는 경우 그룹 삭제
    if (!members || members.length <= 1) {
      console.log('[GroupService] 그룹장만 있음, 그룹 삭제');
      await this.deleteGroup(groupId);
      return;
    }

    // 다른 멤버가 있는 경우 권한 이양
    const newLeader = members.find(m => m.session_id !== leaderSessionId);

    if (!newLeader) {
      console.error('[GroupService] 새 그룹장을 찾을 수 없음');
      throw new Error('No suitable member to transfer leadership');
    }

    console.log('[GroupService] 새 그룹장:', newLeader.session_id);

    // 기존 그룹장 삭제
    await this.removeMember(groupId, leaderSessionId);

    // 새 그룹장 설정
    await this.supabase
      .from('group_members')
      .update({ is_leader: true })
      .eq('id', newLeader.id);

    await this.supabase
      .from('groups')
      .update({ leader_session_id: newLeader.session_id })
      .eq('id', groupId);

    console.log('[GroupService] 그룹장 권한 이양 완료');
  }

  /**
   * 빈 그룹 확인 및 삭제
   */
  private async checkAndDeleteEmptyGroup(groupId: string): Promise<void> {
    console.log('[GroupService] 빈 그룹 확인:', groupId);

    const { data: members, error: membersError } = await this.supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId);

    if (membersError) {
      console.error('[GroupService] 멤버 확인 실패:', membersError);
      return;
    }

    console.log('[GroupService] 남은 멤버 수:', members?.length || 0);

    // 멤버가 없으면 그룹 삭제
    if (!members || members.length === 0) {
      console.log('[GroupService] 멤버가 없음, 그룹 삭제');
      await this.deleteGroup(groupId);
    }
  }

  /**
   * 그룹 삭제
   */
  private async deleteGroup(groupId: string): Promise<void> {
    console.log('[GroupService] 그룹 삭제:', groupId);

    // 먼저 모든 멤버 삭제 (FK 제약조건 대비)
    const { error: membersDeleteError } = await this.supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId);

    if (membersDeleteError) {
      console.error('[GroupService] 멤버 삭제 실패:', membersDeleteError);
    }

    // 그룹 삭제
    const { error: groupDeleteError } = await this.supabase
      .from('groups')
      .delete()
      .eq('id', groupId);

    if (groupDeleteError) {
      console.error('[GroupService] 그룹 삭제 실패:', groupDeleteError);
      throw new Error(`Failed to delete group: ${groupDeleteError.message}`);
    }

    console.log('[GroupService] 그룹 삭제 완료');
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
