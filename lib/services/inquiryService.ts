import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  category: 'bug' | 'feature' | 'suggestion' | 'other';
  title: string;
  content: string;
  status: 'pending' | 'answered';
  adminReply?: string;
  repliedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InquiryInput {
  name: string;
  email: string;
  category: 'bug' | 'feature' | 'suggestion' | 'other';
  title: string;
  content: string;
}

export class InquiryService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * 문의 생성
   */
  async createInquiry(input: InquiryInput): Promise<Inquiry> {
    console.log('[InquiryService] 문의 생성:', {
      name: input.name,
      email: input.email,
      category: input.category,
      title: input.title
    });

    const { data, error } = await this.supabase
      .from('inquiries')
      .insert({
        name: input.name,
        email: input.email,
        category: input.category,
        title: input.title,
        content: input.content,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('[InquiryService] 문의 생성 실패:', error);
      throw new Error(`Failed to create inquiry: ${error.message}`);
    }

    console.log('[InquiryService] 문의 생성 성공:', data.id);
    return this.mapInquiryData(data);
  }

  /**
   * 사용자별 문의 목록 조회
   */
  async getInquiriesByEmail(email: string): Promise<Inquiry[]> {
    console.log('[InquiryService] 이메일로 문의 조회:', email);

    const { data, error } = await this.supabase
      .from('inquiries')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[InquiryService] 문의 조회 실패:', error);
      throw new Error(`Failed to fetch inquiries: ${error.message}`);
    }

    console.log('[InquiryService] 문의 조회 성공:', data.length, '개');
    return data.map(d => this.mapInquiryData(d));
  }

  /**
   * 특정 문의 조회
   */
  async getInquiryById(id: string): Promise<Inquiry | null> {
    console.log('[InquiryService] ID로 문의 조회:', id);

    const { data, error } = await this.supabase
      .from('inquiries')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[InquiryService] 문의 조회 실패:', error);
      return null;
    }

    return this.mapInquiryData(data);
  }

  /**
   * 데이터 매핑
   */
  private mapInquiryData(data: any): Inquiry {
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      category: data.category,
      title: data.title,
      content: data.content,
      status: data.status,
      adminReply: data.admin_reply,
      repliedAt: data.replied_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}
