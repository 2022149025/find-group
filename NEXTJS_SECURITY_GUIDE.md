# Next.js 보안 가이드 (Server Actions 방지)

## 🚨 주요 보안 위협

### 1. Server Actions 취약점 (Next.js 13+)
- **문제**: `'use server'` 지시자를 사용하면 클라이언트가 서버 함수를 직접 호출 가능
- **위험**: DB 수정 함수가 공격자에게 노출됨
- **Burp Suite 등으로 쉽게 조작 가능**

### 2. 원본 소스 노출
- JavaScript 번들이 거의 그대로 노출됨
- 변수명, 함수명, 로직이 그대로 보임
- 공격자가 API 구조를 쉽게 파악

---

## ✅ 현재 프로젝트 보안 상태

### 보안 조치 완료 ✅
1. **Server Actions 미사용**: `'use server'` 사용하지 않음
2. **API Routes만 사용**: `/api/*` 경로로 명확한 인증/검증 가능
3. **관리자 인증 시스템**: Bearer Token 기반 인증
4. **Rate Limiting**: IP 기반 요청 제한
5. **입력 검증**: XSS, SQL Injection 방어
6. **IDOR 방어**: 서버 측 권한 검증
7. **난독화 설정**: Production 빌드에서 console 제거

### 보안 헤더 적용 ✅
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security`
- `Referrer-Policy`
- `Permissions-Policy`

---

## 🔒 API 보안 체계

### 1. 공개 API (인증 불필요)
```typescript
// ✅ 프로필 생성 (sessionId 발급)
POST /api/profile/create

// ✅ 그룹 생성/참가 (sessionId로 검증)
POST /api/group/create
POST /api/group/join

// ✅ 문의 생성 (Rate Limiting만)
POST /api/inquiry/create

// ✅ 그룹 조회 (민감 정보 필터링)
GET /api/group/[groupId]
```

### 2. 인증 필요 API (Bearer Token)
```typescript
// 🔐 관리자 문의 조회
GET /api/inquiry/admin
Authorization: Bearer {token}

// 🔐 관리자 답변 작성
POST /api/inquiry/reply
Authorization: Bearer {token}
```

### 3. 소유권 검증 API (sessionId 기반)
```typescript
// 🔐 그룹 멤버 강퇴 (리더만)
POST /api/group/kick
{ groupId, leaderSessionId, targetSessionId }

// 🔐 그룹 나가기 (본인만)
POST /api/group/leave
{ groupId, sessionId }
```

---

## 📋 보안 체크리스트

### Server Actions 방지 ✅
- [x] `'use server'` 사용 금지
- [x] 모든 DB 작업은 `/api/*` Routes로만 처리
- [x] 클라이언트에서 직접 DB 접근 불가
- [x] Supabase Service Role Key는 서버 측에만 존재

### API 인증/인가 ✅
- [x] 관리자 API: Bearer Token 검증
- [x] 그룹 조작 API: sessionId + DB 검증
- [x] IDOR 방어: 서버 측 소유권 확인
- [x] Rate Limiting: 모든 쓰기 API

### 입력 검증 ✅
- [x] XSS 방지: sanitizeInput()
- [x] SQL Injection 방지: isValidInput()
- [x] 타입 검증: TypeScript + Zod
- [x] 길이 제한: 모든 문자열 필드

### 민감 정보 보호 ✅
- [x] sessionId 클라이언트 노출 방지
- [x] BattleTag 마스킹 (Production)
- [x] 내부 ID 숨김
- [x] 에러 메시지 일반화

### Supabase RLS ⚠️
- [x] RLS 정책 작성됨 (`supabase/rls_policies.sql`)
- [ ] **⚠️ Supabase Dashboard에서 수동 적용 필요**

---

## 🎭 난독화 설정

### next.config.ts
```typescript
compiler: {
  removeConsole: process.env.NODE_ENV === 'production' ? {
    exclude: ['error', 'warn'],
  } : false,
}
```

### 한계
- Next.js는 완전 난독화를 기본 지원하지 않음
- JavaScript는 항상 어느 정도 노출됨
- **따라서 서버 측 검증이 필수**

---

## 🚫 절대 하지 말아야 할 것

### ❌ Server Actions 사용 금지
```typescript
// ❌ 절대 금지!
'use server'

export async function createGroup(sessionId: string) {
  // 공격자가 Burp Suite로 직접 호출 가능!
  await db.groups.create({ ... });
}
```

### ❌ 클라이언트에서 직접 DB 접근
```typescript
// ❌ 절대 금지!
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 🚨 위험!
);
```

### ❌ 민감 정보 환경변수 노출
```typescript
// ❌ NEXT_PUBLIC_ 접두사 사용 금지
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=xxx // 🚨 위험!
NEXT_PUBLIC_ADMIN_PASSWORD=xxx // 🚨 위험!
```

---

## ✅ 올바른 보안 패턴

### ✅ API Routes 사용
```typescript
// ✅ 올바른 방법
// app/api/group/create/route.ts
export async function POST(request: NextRequest) {
  // 1. Rate Limiting
  const rateLimit = checkRateLimit(...);
  
  // 2. 입력 검증
  if (!isValidSessionId(sessionId)) {
    return createValidationError(...);
  }
  
  // 3. DB 작업 (서버에서만)
  const group = await groupService.createGroup(...);
  
  return createSuccessResponse(group);
}
```

### ✅ 서버 측 검증
```typescript
// ✅ 올바른 방법
// lib/security/authorization.ts
export async function validateGroupLeader(
  groupId: string,
  sessionId: string
): Promise<boolean> {
  // DB에서 직접 확인 (클라이언트 믿지 않음)
  const group = await supabaseAdmin
    .from('groups')
    .select('leader_session_id')
    .eq('id', groupId)
    .single();
    
  return group.data?.leader_session_id === sessionId;
}
```

---

## 📊 보안 테스트

### Burp Suite 테스트
```bash
# 1. 권한 없이 관리자 API 호출
curl -X GET https://find-group.vercel.app/api/inquiry/admin
# 기대: 401 Unauthorized

# 2. 타인의 sessionId로 그룹 조작
curl -X POST https://find-group.vercel.app/api/group/kick \
  -d '{"groupId":"xxx","leaderSessionId":"other-session",...}'
# 기대: 403 Forbidden (DB 검증 실패)

# 3. Rate Limiting 테스트
for i in {1..20}; do
  curl -X POST https://find-group.vercel.app/api/profile/create \
    -d '{"nickname":"test",...}'
done
# 기대: 429 Too Many Requests
```

---

## 🎯 권장 사항

### 즉시 적용 필요
1. **Supabase RLS 적용**
   - `supabase/rls_policies.sql` 파일 실행
   - Dashboard에서 RLS 활성화 확인

2. **환경변수 확인**
   - `NEXT_PUBLIC_` 접두사로 민감 정보 노출 여부 확인
   - Service Role Key는 서버 전용

3. **모니터링 설정**
   - 실패한 로그인 시도 모니터링
   - 429 에러 발생 빈도 모니터링

### 추가 보안 강화 (선택)
1. **WAF 적용** (Cloudflare, AWS WAF)
2. **JWT 기반 세션** (현재 메모리 기반)
3. **2FA 도입** (관리자 로그인)
4. **감사 로그** (중요 작업 기록)

---

## 📝 결론

이 프로젝트는 **Server Actions를 사용하지 않고** API Routes로 구현되어 있어 기본적인 보안이 확보되어 있습니다.

### 핵심 보안 원칙
1. **절대 Server Actions 사용 금지** (`'use server'`)
2. **모든 DB 작업은 API Routes로**
3. **서버 측 검증 필수** (클라이언트 믿지 않기)
4. **민감 정보는 환경변수에서 관리** (NEXT_PUBLIC_ 금지)
5. **Rate Limiting + 입력 검증 필수**

### 프로덕션 배포 전 체크
- [ ] Supabase RLS 적용
- [ ] 환경변수 설정 (Vercel)
- [ ] HTTPS 강제 적용
- [ ] 보안 헤더 확인
- [ ] Rate Limiting 테스트
- [ ] Burp Suite 침투 테스트

---

**마지막 업데이트**: 2024-01-15  
**작성자**: AI Assistant  
**프로젝트**: find-group (Overwatch 매칭 서비스)
