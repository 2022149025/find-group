import { createClient } from '@supabase/supabase-js';
import { SessionManager } from '../session/sessionManager';

export interface ProfileInput {
  nickname: string;
  battleTag: string;
  introduction?: string;
  mainPosition: 'Tank' | 'Damage' | 'Support' | 'Flex';
  currentTier: Record<string, string>;
  mainHeroes: Record<string, string[]>;
}

export interface TemporaryProfile extends ProfileInput {
  id: string;
  sessionId: string;
  createdAt: string;
  expiresAt: string;
}

export class ProfileService {
  private supabase;
  private sessionManager: SessionManager;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    this.sessionManager = new SessionManager();
  }

  /**
   * UC-110: 임시 프로필 생성
   */
  async createTemporaryProfile(input: ProfileInput): Promise<TemporaryProfile> {
    // 입력 유효성 검증
    this.validateProfileInput(input);

    const sessionId = this.sessionManager.generateSessionId();
    const expiresAt = this.sessionManager.calculateExpiryTime();

    const { data, error } = await this.supabase
      .from('temporary_profiles')
      .insert({
        session_id: sessionId,
        nickname: input.nickname,
        battle_tag: input.battleTag,
        introduction: input.introduction || '',
        main_position: input.mainPosition,
        current_tier: input.currentTier,
        main_heroes: input.mainHeroes,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create profile: ${error.message}`);

    return {
      id: data.id,
      sessionId: data.session_id,
      nickname: data.nickname,
      battleTag: data.battle_tag,
      introduction: data.introduction,
      mainPosition: data.main_position,
      currentTier: data.current_tier,
      mainHeroes: data.main_heroes,
      createdAt: data.created_at,
      expiresAt: data.expires_at
    };
  }

  /**
   * 프로필 조회
   */
  async getProfile(sessionId: string): Promise<TemporaryProfile | null> {
    const { data, error } = await this.supabase
      .from('temporary_profiles')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      sessionId: data.session_id,
      nickname: data.nickname,
      battleTag: data.battle_tag,
      introduction: data.introduction,
      mainPosition: data.main_position,
      currentTier: data.current_tier,
      mainHeroes: data.main_heroes,
      createdAt: data.created_at,
      expiresAt: data.expires_at
    };
  }

  /**
   * UC-205: 프로필 삭제 (세션 만료 또는 매칭 완료)
   */
  async deleteProfile(sessionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('temporary_profiles')
      .delete()
      .eq('session_id', sessionId);

    if (error) throw new Error(`Failed to delete profile: ${error.message}`);
  }

  /**
   * 입력 유효성 검증
   */
  private validateProfileInput(input: ProfileInput): void {
    if (!input.nickname || input.nickname.length < 2 || input.nickname.length > 15) {
      throw new Error('Nickname must be between 2 and 15 characters');
    }

    if (!input.battleTag) {
      throw new Error('Battle tag is required');
    }

    if (input.introduction && input.introduction.length > 50) {
      throw new Error('Introduction must be 50 characters or less');
    }

    if (!['Tank', 'Damage', 'Support', 'Flex'].includes(input.mainPosition)) {
      throw new Error('Invalid main position');
    }

    if (!input.currentTier || Object.keys(input.currentTier).length === 0) {
      throw new Error('Current tier is required');
    }

    // Flex 포지션은 영웅 선택 불필요
    if (input.mainPosition !== 'Flex') {
      if (!input.mainHeroes || Object.keys(input.mainHeroes).length === 0) {
        throw new Error('Main heroes are required');
      }
    }
  }
}
