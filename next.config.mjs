/** @type {import('next').NextConfig} */
const nextConfig = {
  // ============================================
  // 🔒 보안 설정
  // ============================================
  
  experimental: {
    // Server Actions 비활성화 (보안 강화)
    serverActions: {
      allowedOrigins: [], // 아무 origin도 허용 안 함
      bodySizeLimit: '1mb'
    }
  },
  
  // 프로덕션 소스맵 비활성화
  productionBrowserSourceMaps: false,
  
  // 컴파일러 최적화
  compiler: {
    // React DevTools 제거 (프로덕션)
    reactRemoveProperties: process.env.NODE_ENV === 'production',
    
    // console.log 제거 (프로덕션)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'] // error, warn은 유지
    } : false,
  },
  
  // ============================================
  // 🛡️ 보안 헤더
  // ============================================
  
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Clickjacking 방지
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          // MIME 타입 스니핑 방지
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // XSS 필터 활성화
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          // Referrer 정책
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // 권한 정책
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          // HSTS (HTTPS 강제)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      }
    ]
  },
  
  // ============================================
  // ⚡ 성능 최적화
  // ============================================
  
  // 사용하지 않는 코드 제거
  modularizeImports: {
    'lodash': {
      transform: 'lodash/{{member}}'
    }
  },
  
  // 패키지 최적화
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js']
  },
  
  // 이미지 최적화
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  
  // ============================================
  // 📦 번들 최적화
  // ============================================
  
  // 번들 크기 분석 (개발 시)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config) => {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
        })
      );
      return config;
    }
  })
};

export default nextConfig;
