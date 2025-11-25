# API 보안 감사 보고서

## 📊 API 엔드포인트 분류

### 🔓 공개 API (인증 불필요)
이 API들은 일반 사용자가 접근 가능하며, Rate Limiting과 입력 검증으로 보호됨

#### 1. 프로필 관리
- `POST /api/profile/create` ✅
  - **보안**: Rate Limiting (5/min), 입력 검증, XSS 방지
  - **반환**: sessionId (임시 세션 생성)
  - **위험도**: 낮음 (DB에 프로필만 생성)

#### 2. 그룹 매칭
- `POST /api/group/create` ✅
  - **보안**: Rate Limiting (10/min), sessionId 검증
  - **반환**: 그룹 정보
  - **위험도**: 낮음 (본인 세션으로만 생성 가능)

- `POST /api/group/join` ✅
  - **보안**: Rate Limiting (10/min), sessionId 검증
  - **반환**: 매칭된 그룹 정보
  - **위험도**: 낮음 (본인 세션으로만 참가 가능)

- `GET /api/group/[groupId]` ✅
  - **보안**: 민감 정보 필터링 (sessionId, Profile ID 제외)
  - **반환**: 그룹 + 멤버 정보 (BattleTag 마스킹)
  - **위험도**: 낮음 (읽기 전용, 민감 정보 숨김)

- `GET /api/group/debug` ⚠️ 
  - **보안**: 없음 (디버그용)
  - **위험도**: 높음 (프로덕션에서 제거 필요)

- `GET /api/group/check-complete` ✅
  - **보안**: 읽기 전용
  - **반환**: 완료된 그룹 목록
  - **위험도**: 낮음

#### 3. 문의 시스템
- `POST /api/inquiry/create` ✅
  - **보안**: Rate Limiting (3/min), 입력 검증, XSS 방지
  - **반환**: 생성된 문의
  - **위험도**: 낮음 (스팸 방지만 필요)

- `GET /api/inquiry/list` ✅
  - **보안**: 읽기 전용 (답변된 문의만)
  - **반환**: 공개 문의 목록
  - **위험도**: 낮음

---

### 🔒 소유권 검증 API (sessionId 기반)
본인 또는 권한자만 접근 가능하며, DB 검증을 통해 권한 확인

- `POST /api/group/kick` ✅
  - **보안**: 리더 sessionId + DB 검증
  - **IDOR 방어**: validateGroupLeader() 적용
  - **위험도**: 중간 (DB 검증 필수)

- `POST /api/group/leave` ✅
  - **보안**: 본인 sessionId + DB 검증
  - **IDOR 방어**: validateGroupMembership() 적용
  - **위험도**: 낮음 (본인만 탈퇴 가능)

---

### 🔐 관리자 전용 API (Bearer Token 필수)
관리자만 접근 가능하며, 토큰 검증 필수

- `POST /api/auth/admin/login` ✅
  - **보안**: 비밀번호 검증, 토큰 발급
  - **반환**: Bearer Token (1시간 유효)
  - **위험도**: 높음 (Brute Force 방지 필요)

- `POST /api/auth/admin/logout` ✅
  - **보안**: 토큰 무효화
  - **위험도**: 낮음

- `GET /api/inquiry/admin` 🔐
  - **보안**: Bearer Token 검증
  - **반환**: 모든 문의 목록
  - **위험도**: 높음 (관리자 전용)

- `POST /api/inquiry/reply` 🔐
  - **보안**: Bearer Token 검증, Rate Limiting, 입력 검증
  - **반환**: 업데이트된 문의
  - **위험도**: 높음 (DB 수정)

---

## 🚨 보안 취약점 발견

### 1. ⚠️ DEBUG API 노출
**파일**: `app/api/group/debug/route.ts`

**문제**:
- 프로덕션에서도 접근 가능
- 전체 그룹 데이터 노출
- 인증 없음

**해결책**:
```typescript
// 개발 환경에서만 활성화
if (process.env.NODE_ENV !== 'development') {
  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}
```

### 2. ⚠️ 관리자 로그인 Brute Force 취약
**파일**: `app/api/auth/admin/login/route.ts`

**문제**:
- Rate Limiting 미적용
- 무제한 로그인 시도 가능

**해결책**:
```typescript
// Rate Limiting 추가 (IP당 5회/5분)
const rateLimit = checkRateLimit(`admin-login:${ip}`, 5, 300000);
if (!rateLimit.allowed) {
  return createRateLimitError();
}
```

---

## ✅ 보안 강점

### 1. Server Actions 미사용 ✅
- `'use server'` 지시자 없음
- 모든 DB 작업은 API Routes로만 처리
- Burp Suite로 직접 함수 호출 불가능

### 2. IDOR 방어 완료 ✅
- 모든 그룹 조작 API에 DB 검증 적용
- 클라이언트에서 전달한 sessionId를 믿지 않음
- 서버에서 직접 DB 조회하여 권한 확인

### 3. 입력 검증 철저 ✅
- XSS 방지: `sanitizeInput()`
- SQL Injection 방지: `isValidInput()`
- 타입 검증: TypeScript + Zod
- 길이 제한: 모든 문자열 필드

### 4. 민감 정보 보호 ✅
- sessionId 클라이언트 노출 방지
- BattleTag 마스킹 (Production)
- 내부 ID 숨김
- 에러 메시지 일반화

### 5. Rate Limiting 적용 ✅
- 프로필 생성: 5/min
- 그룹 생성/참가: 10/min
- 문의 생성: 3/min
- 문의 답변: 20/min

---

## 📋 보안 개선 체크리스트

### 즉시 조치 필요 🔴
- [ ] DEBUG API 비활성화 또는 인증 추가
- [ ] 관리자 로그인 Rate Limiting 추가
- [ ] Supabase RLS 적용 (`supabase/rls_policies.sql`)

### 권장 조치 🟡
- [ ] JWT 기반 세션으로 전환 (현재 메모리 기반)
- [ ] 관리자 2FA 도입
- [ ] 로그인 실패 횟수 제한 (계정 잠금)
- [ ] 감사 로그 시스템 구축

### 모니터링 필요 🟢
- [ ] 실패한 로그인 시도 모니터링
- [ ] 429 에러 발생 빈도 모니터링
- [ ] 비정상적인 API 호출 패턴 감지
- [ ] Rate Limit 임계값 조정

---

## 🧪 보안 테스트 시나리오

### 1. Server Actions 우회 시도
```bash
# Burp Suite로 직접 함수 호출 시도
# 기대: 404 Not Found (API Routes만 존재)
```

### 2. IDOR 공격 테스트
```bash
# 타인의 그룹 강퇴 시도
curl -X POST /api/group/kick \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "victim-group-id",
    "leaderSessionId": "attacker-session-id",
    "targetSessionId": "victim-session-id"
  }'
# 기대: 403 Forbidden (validateGroupLeader 실패)
```

### 3. Rate Limiting 테스트
```bash
# 프로필 생성 연속 시도 (6회)
for i in {1..6}; do
  curl -X POST /api/profile/create \
    -H "Content-Type: application/json" \
    -d '{"nickname":"test'$i'","battleTag":"Test#'$i'","mainPosition":"Tank","currentTier":"Gold","mainHeroes":["Reinhardt"]}'
  sleep 0.5
done
# 기대: 처음 5개 성공, 6번째는 429 Too Many Requests
```

### 4. XSS 공격 테스트
```bash
# 악성 스크립트 삽입 시도
curl -X POST /api/inquiry/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<script>alert(\"XSS\")</script>",
    "email": "test@example.com",
    "category": "bug",
    "title": "Test",
    "content": "<img src=x onerror=alert(1)>"
  }'
# 기대: 성공하지만 sanitizeInput()으로 스크립트 제거됨
```

### 5. 관리자 인증 우회 시도
```bash
# 토큰 없이 관리자 API 접근
curl -X GET /api/inquiry/admin
# 기대: 401 Unauthorized

# 잘못된 토큰으로 접근
curl -X GET /api/inquiry/admin \
  -H "Authorization: Bearer fake-token"
# 기대: 401 Unauthorized
```

---

## 📊 위험도 평가

| API 경로 | 인증 | IDOR 방어 | Rate Limit | 위험도 |
|---------|-----|----------|------------|-------|
| POST /api/profile/create | ❌ | N/A | ✅ | 🟢 낮음 |
| POST /api/group/create | ❌ | N/A | ✅ | 🟢 낮음 |
| POST /api/group/join | ❌ | N/A | ✅ | 🟢 낮음 |
| GET /api/group/[groupId] | ❌ | ✅ | N/A | 🟢 낮음 |
| POST /api/group/kick | ✅ (session) | ✅ | ✅ | 🟡 중간 |
| POST /api/group/leave | ✅ (session) | ✅ | ✅ | 🟢 낮음 |
| GET /api/group/debug | ❌ | ❌ | ❌ | 🔴 높음 |
| POST /api/inquiry/create | ❌ | N/A | ✅ | 🟢 낮음 |
| GET /api/inquiry/admin | ✅ (token) | N/A | ❌ | 🟡 중간 |
| POST /api/inquiry/reply | ✅ (token) | N/A | ✅ | 🟡 중간 |
| POST /api/auth/admin/login | ❌ | N/A | ❌ | 🔴 높음 |

---

## 🎯 결론

### 전반적 보안 수준: **양호** ✅

**강점**:
- Server Actions 미사용으로 기본 보안 확보
- IDOR 방어 철저
- 입력 검증 및 XSS 방지 완료
- Rate Limiting 적용

**개선 필요**:
- DEBUG API 프로덕션 비활성화
- 관리자 로그인 Rate Limiting 추가
- Supabase RLS 적용

**프로덕션 배포 가능 여부**: ✅ **가능** (위 2가지 개선 후)

---

**마지막 감사일**: 2024-01-15  
**감사자**: AI Assistant  
**다음 감사 예정**: 2024-02-15
