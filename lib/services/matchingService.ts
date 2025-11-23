import { GroupService } from './groupService';

export class MatchingService {
  private groupService: GroupService;

  constructor() {
    this.groupService = new GroupService();
  }

  /**
   * UC-211: 자동 그룹 매칭 (그룹원으로 시작)
   */
  async autoMatchGroup(sessionId: string, position: 'Tank' | 'Damage' | 'Support'): Promise<{ groupId: string; joined: boolean }> {
    // 대기 중인 그룹 조회
    const waitingGroups = await this.groupService.getWaitingGroups();
    
    console.log(`[MatchingService] 대기 중인 그룹 수: ${waitingGroups.length}`);
    console.log(`[MatchingService] 찾는 포지션: ${position}`);

    // 해당 포지션에 빈자리가 있는 그룹 찾기
    const suitableGroup = waitingGroups.find(group => {
      let hasSpace = false;
      switch (position) {
        case 'Tank':
          hasSpace = group.tankCount < 1;
          break;
        case 'Damage':
          hasSpace = group.damageCount < 2;
          break;
        case 'Support':
          hasSpace = group.supportCount < 2;
          break;
      }
      
      if (hasSpace) {
        console.log(`[MatchingService] 적합한 그룹 발견: ${group.id} (T:${group.tankCount}/D:${group.damageCount}/S:${group.supportCount})`);
      }
      
      return hasSpace;
    });

    if (!suitableGroup) {
      console.log(`[MatchingService] 적합한 그룹 없음. 모든 그룹 상태:`, 
        waitingGroups.map(g => `T:${g.tankCount}/D:${g.damageCount}/S:${g.supportCount}`));
      return { groupId: '', joined: false };
    }

    // 그룹 참가
    try {
      await this.groupService.joinGroup(suitableGroup.id, sessionId, position);
      console.log(`[MatchingService] 그룹 참가 성공: ${suitableGroup.id}`);
      return { groupId: suitableGroup.id, joined: true };
    } catch (error) {
      // 동시성 문제로 참가 실패 시 (다른 사용자가 먼저 참가한 경우)
      console.error(`[MatchingService] 그룹 참가 실패:`, error);
      return { groupId: '', joined: false };
    }
  }

  /**
   * 매칭 가능한 그룹 목록 조회 (선택적 매칭을 위한 기능)
   */
  async findMatchableGroups(position: 'Tank' | 'Damage' | 'Support', limit: number = 10): Promise<any[]> {
    const waitingGroups = await this.groupService.getWaitingGroups();

    const matchableGroups = waitingGroups
      .filter(group => {
        switch (position) {
          case 'Tank':
            return group.tankCount < 1;
          case 'Damage':
            return group.damageCount < 2;
          case 'Support':
            return group.supportCount < 2;
          default:
            return false;
        }
      })
      .slice(0, limit);

    // 각 그룹의 멤버 정보 가져오기
    const groupsWithMembers = await Promise.all(
      matchableGroups.map(async (group) => {
        const { members } = await this.groupService.getGroupWithMembers(group.id);
        return { ...group, members };
      })
    );

    return groupsWithMembers;
  }

  /**
   * 매칭 통계 조회
   */
  async getMatchingStats(): Promise<{
    totalWaitingGroups: number;
    tankNeeded: number;
    damageNeeded: number;
    supportNeeded: number;
  }> {
    const waitingGroups = await this.groupService.getWaitingGroups();

    const stats = {
      totalWaitingGroups: waitingGroups.length,
      tankNeeded: waitingGroups.filter(g => g.tankCount < 1).length,
      damageNeeded: waitingGroups.filter(g => g.damageCount < 2).length,
      supportNeeded: waitingGroups.filter(g => g.supportCount < 2).length
    };

    return stats;
  }
}
