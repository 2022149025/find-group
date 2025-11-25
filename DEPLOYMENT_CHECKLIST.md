# 프로덕션 배포 체크리스트

## ✅ 완료된 보안 조치

### 1. Server Actions 방지 ✅
- [x] `'use server'` 지시자 사용하지 않음
- [x] 모든 DB 작업은 API Routes로만 처리
- [x] Burp Suite로 직접 함수 호출 불가능

### 2. API 인증 & 인가 ✅
- [x] 관리자 API: Bearer Token 인증 (`/api/inquiry/admin`, `/api/inquiry/reply`)
- [x] 그룹 조작 API: sessionId + DB 검증
- [x] IDOR 방어: 서버 측 권한 확인
- [x] Rate Limiting: 모든 쓰기 API

### 3. 입력 검증 ✅
- [x] XSS 방지: `sanitizeInput()`
- [x] SQL Injection 방지: `isValidInput()`
- [x] 타입 검증: TypeScript
- [x] 길이 제한: 모든 필드

### 4. 민감 정보 보호 ✅
- [x] sessionId 클라이언트 노출 방지
- [x] BattleTag 마스킹 (Production)
- [x] 내부 ID 숨김
- [x] 에러 메시지 일반화

### 5. 난독화 & 최적화 ✅
- [x] console.log 제거 (프로덕션)
- [x] 보안 헤더 추가
- [x] DEBUG API 프로덕션 비활성화

### 6. 문서화 ✅
- [x] NEXTJS_SECURITY_GUIDE.md
- [x] API_SECURITY_AUDIT.md
- [x] SECURITY.md
- [x] IDOR_PROTECTION.md
- [x] README.md 업데이트

---

## 🚀 Vercel 배포 전 필수 작업

### 1. 환경변수 설정 🔴 (필수)

Vercel Dashboard → Project Settings → Environment Variables에서 다음 변수를 설정하세요:

```bash
# Supabase 연결 (이미 설정되어 있을 것)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 관리자 비밀번호 (반드시 변경!)
NEXT_PUBLIC_ADMIN_PASSWORD=your-secure-password-here

# 프로덕션 환경 명시
NODE_ENV=production
```

**⚠️ 보안 경고**:
- `NEXT_PUBLIC_ADMIN_PASSWORD`를 기본값 `admin1234`에서 반드시 변경하세요
- 8자 이상, 대문자/소문자/숫자/특수문자 조합 권장
- 예: `MySecur3P@ssw0rd!2024`

### 2. Supabase RLS 적용 🟡 (권장)

```bash
# 1. supabase/rls_policies.sql 파일 내용 확인
cat supabase/rls_policies.sql

# 2. Supabase Dashboard → SQL Editor에서 실행
# 또는 CLI로:
supabase db push
```

**RLS 정책 적용 대상**:
- `temporary_profiles` (세션 기반 접근)
- `groups` (그룹 멤버십 기반 접근)
- `group_members` (자동 만료 세션)

### 3. Git Push 🟢
```bash
git push origin main
```

Vercel은 자동으로 배포를 시작합니다.

---

## 🧪 배포 후 테스트

### 1. 기본 기능 테스트
```bash
# 프로덕션 URL
PROD_URL="https://find-group.vercel.app"

# 프로필 생성
curl -X POST $PROD_URL/api/profile/create \
  -H "Content-Type: application/json" \
  -d '{
    "nickname": "TestUser",
    "battleTag": "Test#1234",
    "mainPosition": "Tank",
    "currentTier": "Gold",
    "mainHeroes": ["Reinhardt"]
  }'

# 그룹 생성
curl -X POST $PROD_URL/api/group/create \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_xxx_xxx",
    "position": "Tank"
  }'
```

### 2. 보안 테스트

#### 2.1 Server Actions 우회 시도
```bash
# Burp Suite로 직접 함수 호출 시도
# 기대: 404 Not Found (API Routes만 존재)
```

#### 2.2 DEBUG API 접근 시도
```bash
curl $PROD_URL/api/group/debug
# 기대: {"success":false,"error":"Not Found"} (404)
```

#### 2.3 관리자 API 인증 우회
```bash
# 토큰 없이 관리자 API 접근
curl $PROD_URL/api/inquiry/admin
# 기대: 401 Unauthorized

# 잘못된 토큰
curl -H "Authorization: Bearer fake-token" $PROD_URL/api/inquiry/admin
# 기대: 401 Unauthorized
```

#### 2.4 Rate Limiting 테스트
```bash
# 프로필 생성 6회 연속 시도
for i in {1..6}; do
  curl -X POST $PROD_URL/api/profile/create \
    -H "Content-Type: application/json" \
    -d '{
      "nickname": "Test'$i'",
      "battleTag": "Test#'$i'",
      "mainPosition": "Tank",
      "currentTier": "Gold",
      "mainHeroes": ["Reinhardt"]
    }'
  sleep 0.5
done
# 기대: 처음 5개 성공, 6번째는 429 Too Many Requests
```

#### 2.5 XSS 공격 시도
```bash
curl -X POST $PROD_URL/api/inquiry/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<script>alert(\"XSS\")</script>",
    "email": "test@example.com",
    "category": "bug",
    "title": "Test",
    "content": "<img src=x onerror=alert(1)>"
  }'
# 기대: 성공하지만 스크립트는 sanitizeInput()으로 제거됨
```

#### 2.6 IDOR 공격 시도
```bash
# 타인의 그룹 강퇴 시도
curl -X POST $PROD_URL/api/group/kick \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "victim-group-id",
    "leaderSessionId": "attacker-session-id",
    "targetSessionId": "victim-session-id"
  }'
# 기대: 403 Forbidden (validateGroupLeader 실패)
```

### 3. 보안 헤더 확인
```bash
curl -I $PROD_URL
# 확인 항목:
# - X-Frame-Options: SAMEORIGIN
# - X-Content-Type-Options: nosniff
# - X-XSS-Protection: 1; mode=block
# - Strict-Transport-Security: max-age=63072000
# - Referrer-Policy: strict-origin-when-cross-origin
```

---

## 📊 배포 후 모니터링

### Vercel Dashboard 확인 사항
1. **배포 상태**: 성공 여부
2. **빌드 로그**: 에러 없는지 확인
3. **환경변수**: 모든 변수 올바르게 설정되었는지
4. **도메인**: HTTPS 강제 적용 확인

### 주요 메트릭
- **응답 시간**: API 응답 속도
- **에러율**: 5xx 에러 발생 빈도
- **트래픽**: 비정상적인 트래픽 패턴
- **Rate Limit**: 429 에러 발생 빈도

### 로그 모니터링
- 실패한 로그인 시도 (관리자)
- Rate Limit 초과
- 서버 에러 (500)
- 인증 실패 (401, 403)

---

## ⚠️ 알려진 제한사항

### 1. 메모리 기반 세션
- **현재**: 관리자 세션이 메모리에 저장됨
- **제한**: 서버리스 환경에서 재시작 시 세션 초기화
- **개선안**: Redis 또는 Supabase 기반 세션 (향후)

### 2. Rate Limiting 메모리 기반
- **현재**: IP별 요청 제한이 메모리에 저장됨
- **제한**: 서버리스 환경에서 정확도 낮음
- **개선안**: Redis 기반 Rate Limiting (향후)

### 3. 세션 자동 정리
- **현재**: 30분 만료 세션이 DB에 남아있음
- **제한**: 수동으로 정리 필요
- **개선안**: Supabase Cron Jobs 또는 Vercel Cron (향후)

---

## 🎯 프로덕션 배포 최종 점검

### 배포 전 체크리스트
- [ ] `npm run build` 성공
- [ ] 환경변수 설정 (Vercel)
- [ ] 관리자 비밀번호 변경
- [ ] Git push 완료
- [ ] Supabase RLS 적용 (권장)

### 배포 후 체크리스트
- [ ] 프로필 생성 테스트
- [ ] 그룹 생성/참가 테스트
- [ ] 관리자 로그인 테스트
- [ ] DEBUG API 접근 차단 확인
- [ ] Rate Limiting 동작 확인
- [ ] 보안 헤더 확인
- [ ] HTTPS 강제 적용 확인

---

## 🆘 문제 해결

### 배포 실패 시
1. Vercel 빌드 로그 확인
2. 환경변수 누락 여부 확인
3. TypeScript 에러 확인
4. Supabase 연결 확인

### 관리자 로그인 실패 시
1. `NEXT_PUBLIC_ADMIN_PASSWORD` 환경변수 확인
2. Rate Limiting 초과 여부 확인 (5회/분)
3. 브라우저 콘솔 에러 확인

### API 403 에러 시
1. sessionId 유효성 확인 (30분 만료)
2. 권한 검증 로직 확인
3. Supabase RLS 정책 확인

---

## 📚 관련 문서

- [NEXTJS_SECURITY_GUIDE.md](./NEXTJS_SECURITY_GUIDE.md) - Next.js 보안 가이드
- [API_SECURITY_AUDIT.md](./API_SECURITY_AUDIT.md) - API 보안 감사 보고서
- [SECURITY.md](./SECURITY.md) - 전체 보안 문서
- [IDOR_PROTECTION.md](./IDOR_PROTECTION.md) - IDOR 방어 가이드
- [README.md](./README.md) - 프로젝트 개요

---

**최종 업데이트**: 2024-01-15  
**배포 준비 완료**: ✅  
**프로덕션 배포 가능**: ✅
