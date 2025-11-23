import { createClient } from '@supabase/supabase-js';

export class SessionManager {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * 고유한 세션 ID 생성
   */
  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * 세션 만료 시간 계산 (30분)
   */
  calculateExpiryTime(): Date {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    return now;
  }

  /**
   * 만료된 세션 정리 (크론잡 또는 수동 호출)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const { data, error } = await this.supabase
      .from('temporary_profiles')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) throw error;
    return data?.length || 0;
  }

  /**
   * 세션 유효성 검증
   */
  async validateSession(sessionId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('temporary_profiles')
      .select('expires_at')
      .eq('session_id', sessionId)
      .single();

    if (error || !data) return false;
    
    const expiresAt = new Date(data.expires_at);
    return expiresAt > new Date();
  }

  /**
   * 세션 연장 (활동 시)
   */
  async extendSession(sessionId: string): Promise<void> {
    const newExpiryTime = this.calculateExpiryTime();
    
    const { error } = await this.supabase
      .from('temporary_profiles')
      .update({ expires_at: newExpiryTime.toISOString() })
      .eq('session_id', sessionId);

    if (error) throw error;
  }
}
