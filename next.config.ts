import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 빌드 최적화
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // 🔒 보안 강화
  poweredByHeader: false, // X-Powered-By 헤더 숨기기
  compress: true, // 압축 활성화
  
  // 🎭 난독화 및 최적화 설정
  compiler: {
    // 프로덕션에서 console 제거
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // error, warn은 유지
    } : false,
  },
  
  // Next.js 16은 기본적으로 SWC minification 사용
  // swcMinify는 Next.js 13+에서 기본값이 true이므로 명시 불필요
  
  // 환경변수
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  
  // 🔐 보안 헤더
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net",
              "img-src 'self' data: https:",
              "font-src 'self' data: https://cdn.jsdelivr.net",
              "connect-src 'self'",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'"
            ].join('; ')
          }
        ],
      },
    ];
  },
};

export default nextConfig;
