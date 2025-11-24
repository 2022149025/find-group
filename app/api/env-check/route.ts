import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      server: {
        isServer: typeof window === 'undefined',
        hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        serviceRoleKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
        serviceRoleKeyPreview: process.env.SUPABASE_SERVICE_ROLE_KEY 
          ? process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20) + '...' 
          : 'NOT SET',
      },
      public: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseUrlPreview: process.env.NEXT_PUBLIC_SUPABASE_URL 
          ? process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30) + '...' 
          : 'NOT SET',
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        anonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
        anonKeyPreview: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
          ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20) + '...' 
          : 'NOT SET',
      },
      recommendation: {
        canUseServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        shouldAddServiceRole: !process.env.SUPABASE_SERVICE_ROLE_KEY,
        message: process.env.SUPABASE_SERVICE_ROLE_KEY
          ? '✅ Service Role Key가 설정되어 있습니다. RLS를 우회할 수 있습니다.'
          : '⚠️ Service Role Key가 없습니다. Vercel 환경 변수에 SUPABASE_SERVICE_ROLE_KEY를 추가하거나, Supabase에서 RLS를 비활성화하세요.'
      }
    }
  });
}
