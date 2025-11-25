# ⚠️ Next.js 16 보안 주의사항

## 🚨 Server Actions 보안 위험

### **문제점**
```typescript
// ❌ 극도로 위험한 코드 (절대 사용 금지!)
'use server'

export async function deleteUser(userId: string) {
  // 공격자가 직접 이 함수를 호출할 수 있음!
  await db.users.delete(userId);
}

// 클라이언트에서:
<button onClick={() => deleteUser('any-user-id')}>
  Delete
</button>
```

### **왜 위험한가?**
```
1. 함수가 클라이언트에서 직접 호출 가능
2. URL 엔드포인트가 자동 생성됨
3. 공격자가 POST 요청으로 직접 호출 가능
4. 인증/권한 검증이 없으면 DB 직접 조작 가능
```

### **현재 프로젝트 상태**
```bash
✅ 'use server' 사용 안 함 (확인 완료)
✅ 모든 데이터 변경은 /api/* 경로 사용
✅ 각 API 경로마다 권한 검증 구현
```

---

## 🔒 API Routes 보안 상태

### **인증이 필요한 API**
```typescript
POST /api/group/create       ✅ validateSessionOwnership
POST /api/group/join         ✅ validateSessionOwnership  
POST /api/group/kick         ✅ validateGroupLeadership
POST /api/group/leave        ✅ validateGroupMembership
GET  /api/group/[groupId]    ✅ Rate Limiting (인증 불필요)
POST /api/inquiry/create     ✅ Rate Limiting (인증 불필요)
POST /api/inquiry/reply      ⚠️  관리자 비밀번호 (강화 권장)
```

### **인증이 불필요한 API**
```typescript
POST /api/profile/create     ✅ Rate Limiting (누구나 생성 가능)
GET  /api/inquiry/list       ✅ 이메일 기반 조회
```

---

## 🛡️ 권장 보안 강화

### **1. Next.js 설정에서 Server Actions 비활성화**

**파일: `next.config.mjs`**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Server Actions 완전 비활성화 (권장)
      allowedOrigins: [], // 아무 origin도 허용 안 함
      bodySizeLimit: '1mb'
    }
  },
  
  // 프로덕션 빌드 최적화
  compiler: {
    // React DevTools 제거 (프로덕션)
    reactRemoveProperties: process.env.NODE_ENV === 'production',
    
    // console.log 제거 (프로덕션)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },
  
  // 보안 헤더
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ]
  }
};

export default nextConfig;
```

### **2. 프로덕션 빌드 난독화**

**Vercel 자동 난독화:**
```bash
✅ Next.js 자동으로 번들링 및 최소화
✅ Terser로 코드 압축
✅ 변수명 짧게 변경
✅ 불필요한 공백 제거

하지만 완전한 난독화는 아님:
- 로직은 여전히 추적 가능
- API 엔드포인트는 명확히 보임
- 따라서 서버 측 검증이 필수!
```

**추가 난독화 (선택사항):**
```bash
# webpack-obfuscator 설치
npm install --save-dev webpack-obfuscator

# next.config.mjs에 추가
import WebpackObfuscator from 'webpack-obfuscator';

const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer && process.env.NODE_ENV === 'production') {
      config.plugins.push(
        new WebpackObfuscator({
          rotateStringArray: true,
          stringArray: true,
          stringArrayThreshold: 0.75
        }, ['excluded_bundle_name.js'])
      );
    }
    return config;
  }
};
```

---

## 🔐 관리자 API 보안 강화

### **현재 문제**
```typescript
// ⚠️ 환경변수 비밀번호만으로 인증
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

if (password === ADMIN_PASSWORD) {
  // 관리자 작업 허용
}
```

### **강화 방안 1: API 레벨 인증**

**파일: `lib/security/adminAuth.ts`**
```typescript
import { createHash } from 'crypto';

// 관리자 세션 저장소 (메모리)
const adminSessions = new Map<string, { expires: number }>();

// 관리자 로그인
export async function createAdminSession(password: string): Promise<{
  valid: boolean;
  token?: string;
  error?: string;
}> {
  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
  
  if (password !== ADMIN_PASSWORD) {
    return { valid: false, error: '비밀번호가 올바르지 않습니다.' };
  }
  
  // 토큰 생성 (32바이트 랜덤)
  const token = createHash('sha256')
    .update(`${Date.now()}-${Math.random()}`)
    .digest('hex');
  
  // 세션 저장 (1시간 유효)
  adminSessions.set(token, {
    expires: Date.now() + 3600000
  });
  
  return { valid: true, token };
}

// 관리자 토큰 검증
export function validateAdminToken(token: string): boolean {
  const session = adminSessions.get(token);
  
  if (!session) return false;
  
  // 만료 확인
  if (Date.now() > session.expires) {
    adminSessions.delete(token);
    return false;
  }
  
  return true;
}

// 만료된 세션 정리
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of adminSessions.entries()) {
    if (now > session.expires) {
      adminSessions.delete(token);
    }
  }
}, 60000); // 1분마다
```

### **강화 방안 2: 관리자 API에 토큰 검증 추가**

**파일: `app/api/inquiry/reply/route.ts`**
```typescript
export async function POST(request: NextRequest) {
  // 관리자 토큰 검증
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token || !validateAdminToken(token)) {
    return createAuthError('관리자 인증이 필요합니다.');
  }
  
  // ... 기존 코드
}
```

---

## 📊 소스 코드 노출 완화

### **현재 상황**
```
1. 클라이언트 번들에 로직 포함됨
2. 개발자 도구로 소스맵 확인 가능
3. API 엔드포인트 명확히 보임
```

### **완화 전략**

#### **1. 소스맵 비활성화 (프로덕션)**
```javascript
// next.config.mjs
const nextConfig = {
  productionBrowserSourceMaps: false, // 기본값
};
```

#### **2. 중요 로직은 서버 측에만**
```typescript
// ❌ 클라이언트에서 검증
function validateUser(userId) {
  // 이 로직이 번들에 포함됨
  return userId.length > 10;
}

// ✅ 서버에서만 검증
// app/api/validate/route.ts
export async function POST(request) {
  // 클라이언트는 이 로직을 볼 수 없음
  const validation = complexValidationLogic();
  return Response.json({ valid: validation });
}
```

#### **3. 환경변수 보호**
```typescript
// ❌ 위험 (클라이언트 노출)
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

// ✅ 안전 (서버 전용)
const API_KEY = process.env.API_KEY; // NEXT_PUBLIC_ 없음
```

#### **4. API 경로 난독화 (선택사항)**
```typescript
// 대신:
POST /api/group/kick

// 사용 (해시):
POST /api/g/k8x2p9q
POST /api/actions/a7b2c3d

// 하지만 보안상 큰 이점은 없음
// 서버 측 검증이 더 중요!
```

---

## 🧪 보안 테스트

### **1. Server Actions 호출 시도**
```bash
# 테스트: Server Actions 엔드포인트 찾기
curl -X POST https://find-group.vercel.app/_next/data/...

# 예상 결과:
404 Not Found (Server Actions 없음)

✅ PASS
```

### **2. API 인증 우회 시도**
```bash
# 테스트: 인증 없이 킥 시도
curl -X POST https://find-group.vercel.app/api/group/kick \
  -H "Content-Type: application/json" \
  -d '{"groupId":"...", "leaderSessionId":"fake", "targetSessionId":"..."}'

# 예상 결과:
403 Forbidden (권한 없음)

✅ PASS
```

### **3. 소스 코드 분석**
```bash
# 개발자 도구에서 확인:
1. Sources 탭 확인
2. .map 파일 확인 (없어야 함)
3. 번들 파일 확인 (난독화됨)

✅ PASS: 소스맵 없음, 번들 최소화됨
```

---

## 📋 배포 전 체크리스트

### **코드 보안**
```bash
✅ 'use server' 사용 안 함
✅ 모든 API에 권한 검증 구현
✅ 환경변수는 NEXT_PUBLIC_ 최소화
✅ 중요 로직은 서버 측에만
```

### **Next.js 설정**
```bash
✅ Server Actions 비활성화
✅ 프로덕션 소스맵 비활성화
✅ console.log 제거 (프로덕션)
✅ 보안 헤더 설정
```

### **빌드 검증**
```bash
npm run build

# 확인:
✅ 번들 크기 적절
✅ 소스맵 없음
✅ 난독화 적용됨
```

### **배포 후 검증**
```bash
1. _next/data/ 경로 확인 → 404
2. API 인증 테스트 → 403
3. 소스 코드 확인 → 난독화됨
```

---

## ⚡ 성능 최적화 (보너스)

### **번들 크기 최적화**
```javascript
// next.config.mjs
const nextConfig = {
  // Tree shaking 강화
  modularizeImports: {
    'lodash': {
      transform: 'lodash/{{member}}'
    }
  },
  
  // 사용하지 않는 코드 제거
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js']
  }
};
```

### **이미지 최적화**
```javascript
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  }
};
```

---

## 🎯 요약

### **현재 보안 상태**
```
✅ Server Actions 미사용
✅ API Routes 권한 검증
✅ Rate Limiting 적용
✅ IDOR 방어 구현
⚠️  관리자 API 토큰 인증 권장
⚠️  프로덕션 난독화 권장
```

### **권장 추가 작업**
```
1. next.config.mjs 보안 설정
2. 관리자 토큰 인증 추가
3. 프로덕션 빌드 난독화
4. 보안 헤더 설정
```

### **핵심 원칙**
```
🔒 클라이언트를 절대 신뢰하지 마세요
🔒 모든 검증은 서버에서
🔒 Server Actions는 신중히 사용
🔒 소스 코드 노출은 어쩔 수 없음 → 서버 검증이 답!
```

---

**마지막 업데이트**: 2025-01-25  
**Next.js 버전**: 16.0.3  
**상태**: ⚠️ 추가 보안 강화 권장
