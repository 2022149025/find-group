/**
 * 서버 측 권한 검증 및 IDOR 방어
 * 
 * 🔒 보안 원칙:
 * 1. 클라이언트에서 전달된 sessionId는 절대 신뢰하지 않음
 * 2. 모든 리소스 접근 시 소유권(ownership) 검증 필수
 * 3. 그룹 작업 시 멤버십 검증 필수
 * 4. 관리자 작업 시 리더 권한 검증 필수
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * 세션 유효성 검증 (서버 측)
 * DB에서 세션이 실제로 존재하고 만료되지 않았는지 확인
 */
export async function validateSessionOwnership(sessionId: string): Promise<{
  valid: boolean;
  profile?: any;
  error?: string;
}> {
  try {
    // DB에서 세션 조회
    const { data: profile, error } = await supabase
      .from('temporary_profiles')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error || !profile) {
      return { valid: false, error: '세션을 찾을 수 없습니다.' };
    }

    // 만료 확인
    const expiresAt = new Date(profile.expires_at);
    if (expiresAt < new Date()) {
      return { valid: false, error: '세션이 만료되었습니다.' };
    }

    return { valid: true, profile };
  } catch (error) {
    console.error('[validateSessionOwnership] Error:', error);
    return { valid: false, error: '세션 검증 중 오류가 발생했습니다.' };
  }
}

/**
 * 그룹 멤버십 검증
 * 사용자가 실제로 해당 그룹의 멤버인지 확인
 */
export async function validateGroupMembership(
  groupId: string,
  sessionId: string
): Promise<{
  valid: boolean;
  isLeader: boolean;
  member?: any;
  error?: string;
}> {
  try {
    // 세션 유효성 먼저 확인
    const sessionCheck = await validateSessionOwnership(sessionId);
    if (!sessionCheck.valid) {
      return { valid: false, isLeader: false, error: sessionCheck.error };
    }

    // 그룹 멤버십 확인
    const { data: member, error } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('session_id', sessionId)
      .single();

    if (error || !member) {
      return { 
        valid: false, 
        isLeader: false, 
        error: '해당 그룹의 멤버가 아닙니다.' 
      };
    }

    return { 
      valid: true, 
      isLeader: member.is_leader || false,
      member 
    };
  } catch (error) {
    console.error('[validateGroupMembership] Error:', error);
    return { 
      valid: false, 
      isLeader: false, 
      error: '멤버십 검증 중 오류가 발생했습니다.' 
    };
  }
}

/**
 * 그룹 리더 권한 검증
 * 킥, 그룹 설정 변경 등 관리자 작업 시 사용
 */
export async function validateGroupLeadership(
  groupId: string,
  sessionId: string
): Promise<{
  valid: boolean;
  error?: string;
}> {
  const membership = await validateGroupMembership(groupId, sessionId);
  
  if (!membership.valid) {
    return { valid: false, error: membership.error };
  }

  if (!membership.isLeader) {
    return { valid: false, error: '그룹장 권한이 필요합니다.' };
  }

  return { valid: true };
}

/**
 * 프로필 소유권 검증
 * 사용자가 자신의 프로필을 수정하는지 확인
 */
export async function validateProfileOwnership(
  profileId: string,
  sessionId: string
): Promise<{
  valid: boolean;
  profile?: any;
  error?: string;
}> {
  try {
    // 세션 유효성 먼저 확인
    const sessionCheck = await validateSessionOwnership(sessionId);
    if (!sessionCheck.valid) {
      return { valid: false, error: sessionCheck.error };
    }

    // 프로필 조회 및 소유권 확인
    const { data: profile, error } = await supabase
      .from('temporary_profiles')
      .select('*')
      .eq('id', profileId)
      .eq('session_id', sessionId)
      .single();

    if (error || !profile) {
      return { 
        valid: false, 
        error: '프로필에 접근할 권한이 없습니다.' 
      };
    }

    return { valid: true, profile };
  } catch (error) {
    console.error('[validateProfileOwnership] Error:', error);
    return { 
      valid: false, 
      error: '프로필 소유권 검증 중 오류가 발생했습니다.' 
    };
  }
}

/**
 * 타겟 세션이 실제로 그룹 멤버인지 검증 (킥 등에 사용)
 */
export async function validateTargetMembership(
  groupId: string,
  targetSessionId: string
): Promise<{
  valid: boolean;
  member?: any;
  error?: string;
}> {
  try {
    const { data: member, error } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('session_id', targetSessionId)
      .single();

    if (error || !member) {
      return { 
        valid: false, 
        error: '대상 사용자가 그룹 멤버가 아닙니다.' 
      };
    }

    // 리더는 킥할 수 없음
    if (member.is_leader) {
      return { 
        valid: false, 
        error: '그룹장은 강제 퇴장시킬 수 없습니다.' 
      };
    }

    return { valid: true, member };
  } catch (error) {
    console.error('[validateTargetMembership] Error:', error);
    return { 
      valid: false, 
      error: '대상 멤버십 검증 중 오류가 발생했습니다.' 
    };
  }
}

/**
 * 그룹 존재 및 상태 검증
 */
export async function validateGroupExists(
  groupId: string
): Promise<{
  valid: boolean;
  group?: any;
  error?: string;
}> {
  try {
    const { data: group, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (error || !group) {
      return { 
        valid: false, 
        error: '그룹을 찾을 수 없습니다.' 
      };
    }

    return { valid: true, group };
  } catch (error) {
    console.error('[validateGroupExists] Error:', error);
    return { 
      valid: false, 
      error: '그룹 조회 중 오류가 발생했습니다.' 
    };
  }
}
