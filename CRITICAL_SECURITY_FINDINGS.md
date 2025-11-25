# 🚨 긴급 보안 취약점 발견

## 발견 일자
2024-01-15

---

## 1. 🔴 Turbopack WebAssembly 모듈 로딩 취약점

### 문제점
Turbopack의 `loadWebAssembly` 및 `loadWebAssemblyModule` 함수가 **SRI(Subresource Integrity) 해시 검증 없이** 동적으로 WebAssembly 모듈을 로드합니다.

### 발견된 코드
```javascript
// .next/static/chunks/turbopack-*.js
async loadWebAssembly(e,t,r,n,o){
  let l=fetch(S(r)),  // r: 모듈 경로
  {instance:i}=await WebAssembly.instantiateStreaming(l,o);
  return i.exports
},
async loadWebAssemblyModule(e,t,r,n){
  let o=fetch(S(r));
  return await WebAssembly.compileStreaming(o)
}
```

### 공격 시나리오
1. **경로 조작 가능 시**:
   - 공격자가 `r` 경로를 조작하여 악성 WASM 모듈을 로드
   - 피해자 브라우저에서 악성 코드 실행

2. **중간자 공격(MITM)**:
   - SRI 해시가 없어 네트워크 레벨에서 모듈 변조 가능
   - CDN 또는 프록시를 통한 악성 모듈 주입

### 위험도
🔴 **높음** - WebAssembly는 네이티브 수준의 성능으로 악성 코드 실행 가능

### 현재 프로젝트 영향
✅ **낮음** - 현재 프로젝트는 WebAssembly를 직접 사용하지 않음
- Next.js/Turbopack 내부적으로만 사용
- 사용자 입력으로 WASM 경로 조작 불가능

### 권장 조치
1. **즉시 조치 불필요** (WebAssembly 미사용)
2. **향후 WebAssembly 사용 시**:
   ```html
   <!-- SRI 해시 적용 -->
   <script 
     src="/wasm-module.wasm" 
     integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
     crossorigin="anonymous">
   </script>
   ```
3. **Next.js/Turbopack 업데이트 모니터링**
4. **CSP 헤더에 WASM 제한 추가**:
   ```
   Content-Security-Policy: script-src 'self'; object-src 'none';
   ```

---

## 2. 🔴 CSRF(Cross-Site Request Forgery) 취약점

### 문제점
**모든 상태 변경 API 호출에 Anti-CSRF 토큰이 없습니다.**

### 발견된 코드

#### 프로필 생성 (app/page.tsx)
```typescript
const response = await fetch('/api/profile/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(profileData)
  // ❌ CSRF 토큰 없음
});
```

#### 그룹 생성/참가 (app/page.tsx)
```typescript
const response = await fetch('/api/group/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId, position })
  // ❌ CSRF 토큰 없음
});
```

#### 관리자 답변 (app/admin/inquiries/page.tsx)
```typescript
const response = await fetch('/api/inquiry/reply', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`  // Bearer 토큰만 있음
  },
  body: JSON.stringify({ inquiryId, adminReply })
  // ❌ CSRF 토큰 없음
});
```

### 공격 시나리오

#### 시나리오 1: 일반 사용자 공격
```html
<!-- 악성 사이트: evil.com -->
<script>
fetch('https://find-group.vercel.app/api/group/create', {
  method: 'POST',
  credentials: 'include',  // 쿠키 포함 (만약 사용 시)
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: 'victim-session-id',
    position: 'Tank'
  })
});
</script>
```

#### 시나리오 2: 관리자 공격 (더 위험)
```html
<!-- 악성 사이트: evil.com -->
<script>
// 관리자가 로그인한 상태에서 이 페이지 방문 시
fetch('https://find-group.vercel.app/api/inquiry/reply', {
  method: 'POST',
  credentials: 'include',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${stolenToken}`  // 로컬 스토리지에서 탈취 가능
  },
  body: JSON.stringify({
    inquiryId: 'target-inquiry-id',
    adminReply: '악성 답변 내용'
  })
});
</script>
```

### 현재 프로젝트의 CSRF 위험도 평가

#### 🟡 중간 위험 (즉시 조치 권장)

**위험한 API**:
- ✅ **일반 API는 상대적으로 안전**
  - sessionId 기반 (쿠키 아님)
  - sessionId는 로컬 스토리지/메모리에 저장
  - 브라우저 Same-Origin Policy로 보호됨
  
- 🔴 **관리자 API는 위험**
  - Bearer Token이 로컬 스토리지에 저장될 경우 XSS로 탈취 가능
  - CSRF 토큰 없이 악성 사이트에서 요청 가능

### 세션 저장 방식 확인 필요

#### 현재 구현 확인
```typescript
// 확인 필요: sessionId 어디에 저장?
// 1. localStorage? → XSS 취약
// 2. sessionStorage? → 상대적으로 안전
// 3. 메모리? → 가장 안전
// 4. 쿠키? → CSRF 취약
```

---

## 3. 🟡 쿠키 보안 설정 부재

### 문제점
쿠키 사용 시 **SameSite, Secure, HttpOnly 플래그가 설정되지 않았습니다.**

### 검색 결과
```bash
grep -r "cookie\|Cookie" --include="*.ts" --include="*.tsx" app/ lib/
# 결과: SameSite, Secure, HttpOnly 설정 없음
```

### 현재 프로젝트 영향
✅ **낮음** - 현재 프로젝트는 쿠키를 사용하지 않음
- sessionId: 로컬 스토리지 또는 메모리
- Bearer Token: 로컬 스토리지 (추정)

### 향후 쿠키 사용 시 권장 설정
```typescript
// Next.js API Route에서 쿠키 설정 시
import { serialize } from 'cookie';

response.setHeader('Set-Cookie', serialize('sessionId', value, {
  httpOnly: true,      // JavaScript 접근 불가 (XSS 방어)
  secure: true,        // HTTPS only
  sameSite: 'strict',  // CSRF 방어
  path: '/',
  maxAge: 1800         // 30분
}));
```

---

## 🎯 우선순위별 대응 방안

### 🔴 높음 (즉시 조치)

#### 1. CSRF 토큰 구현 (관리자 API)
```typescript
// lib/security/csrf.ts
import { randomBytes, createHash } from 'crypto';

const csrfTokens = new Map<string, { token: string; expiresAt: number }>();

export function generateCSRFToken(sessionId: string): string {
  const token = randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 3600000; // 1시간
  
  csrfTokens.set(sessionId, { token, expiresAt });
  
  return token;
}

export function validateCSRFToken(sessionId: string, token: string): boolean {
  const stored = csrfTokens.get(sessionId);
  
  if (!stored) return false;
  if (Date.now() > stored.expiresAt) {
    csrfTokens.delete(sessionId);
    return false;
  }
  
  return stored.token === token;
}
```

#### 2. Double Submit Cookie 패턴 (간단한 대안)
```typescript
// 쿠키와 헤더 모두에 토큰 전송
// 서버에서 두 값이 일치하는지 확인
```

### 🟡 중간 (단기 조치)

#### 1. SameSite Cookie 설정
```typescript
// next.config.ts
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Set-Cookie',
          value: 'SameSite=Strict; Secure; HttpOnly'
        }
      ]
    }
  ];
}
```

#### 2. CSP 헤더 강화
```typescript
// WebAssembly 제한 추가
{
  key: 'Content-Security-Policy',
  value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; object-src 'none'; base-uri 'self';"
}
```

### 🟢 낮음 (장기 과제)

#### 1. Origin 검증 강화
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  
  if (origin && !origin.includes(host)) {
    return new Response('Forbidden', { status: 403 });
  }
}
```

#### 2. Referer 검증
```typescript
// API Route에서 Referer 확인
const referer = request.headers.get('referer');
if (!referer?.startsWith('https://find-group.vercel.app')) {
  return NextResponse.json({ error: 'Invalid referer' }, { status: 403 });
}
```

---

## 📊 위험도 평가 종합

| 취약점 | 현재 위험도 | 향후 위험도 | 우선순위 |
|--------|------------|------------|----------|
| WebAssembly 모듈 로딩 | 🟢 낮음 | 🟡 중간 | 낮음 |
| CSRF (일반 API) | 🟢 낮음 | 🟢 낮음 | 낮음 |
| CSRF (관리자 API) | 🔴 높음 | 🔴 높음 | **높음** |
| 쿠키 보안 설정 | 🟢 낮음 | 🟡 중간 | 중간 |

---

## 🔍 추가 확인 필요 사항

### 1. sessionId 저장 위치 확인
```bash
# 프론트엔드 코드에서 sessionId 저장 방식 확인
grep -r "sessionId" app/ components/ --include="*.tsx"
grep -r "localStorage\|sessionStorage" app/ components/
```

### 2. Bearer Token 저장 위치 확인
```bash
# 관리자 토큰 저장 방식 확인
grep -r "token" app/admin/ --include="*.tsx"
grep -r "localStorage.setItem\|sessionStorage.setItem" app/admin/
```

### 3. 실제 쿠키 사용 여부 확인
```bash
# 브라우저 개발자 도구 → Application → Cookies
# 실제 운영 환경에서 쿠키 존재 여부 확인
```

---

## ✅ 즉시 적용 가능한 완화 조치

### 1. Origin 헤더 검증 (즉시 적용)
```typescript
// lib/security/validation.ts에 추가
export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'https://find-group.vercel.app',
    'http://localhost:3000'  // 개발 환경
  ];
  
  if (!origin) return true; // Same-origin 요청
  return allowedOrigins.includes(origin);
}
```

### 2. Referer 검증 (즉시 적용)
```typescript
// 관리자 API에 추가
export async function POST(request: NextRequest) {
  const referer = request.headers.get('referer');
  
  if (referer && !referer.startsWith(process.env.NEXT_PUBLIC_SITE_URL || 'https://find-group.vercel.app')) {
    return NextResponse.json(
      { success: false, error: 'Invalid referer' },
      { status: 403 }
    );
  }
  
  // 기존 로직...
}
```

---

**작성자**: AI Assistant  
**작성일**: 2024-01-15  
**심각도**: 🔴 높음 (관리자 API CSRF)  
**상태**: 즉시 조치 필요
