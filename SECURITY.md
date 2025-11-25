# 🔐 보안 가이드

## 프로덕션 배포 전 필수 보안 체크리스트

### ✅ 1. 환경변수 보안 설정

#### **필수 환경변수**
```bash
# Supabase (데이터베이스)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # 절대 노출 금지!

# 관리자 비밀번호
NEXT_PUBLIC_ADMIN_PASSWORD=YourStrongPassword123!  # 기본값 변경 필수!
```

#### **Vercel 환경변수 설정**
1. Vercel Dashboard → Settings → Environment Variables
2. 각 변수 추가 및 Environment 선택 (Production/Preview/Development)
3. **중요**: `SUPABASE_SERVICE_ROLE_KEY`는 절대 `NEXT_PUBLIC_` 접두사 사용 금지!

---

### ✅ 2. 구현된 보안 기능

#### **입력 검증 (Input Validation)**
- ✅ XSS 방지: HTML 태그 sanitization
- ✅ SQL Injection 방지: 위험한 SQL 키워드 차단
- ✅ 이메일 검증: RFC 5322 형식 검증
- ✅ UUID 검증: 표준 UUID 형식
- ✅ 배틀태그 검증: `PlayerName#1234` 형식
- ✅ 길이 제한: 각 필드별 최소/최대 길이

#### **Rate Limiting**
```typescript
// API별 제한
- 프로필 생성: 5개/분
- 그룹 생성: 10개/분
- 문의 생성: 3개/분
- 문의 답변: 20개/분
```

#### **에러 핸들링**
- ✅ 프로덕션 환경: 민감한 정보 숨김
- ✅ 개발 환경: 상세한 디버그 정보
- ✅ 표준화된 에러 응답 형식
- ✅ 에러 로깅 시스템

#### **API 보안**
- ✅ JSON 파싱 안전성 검증
- ✅ CORS 설정
- ✅ 요청 로깅
- ✅ IP 기반 Rate Limiting

---

### ✅ 3. 관리자 인증 보안

#### **현재 구현**
- 환경변수 기반 비밀번호 인증
- SessionStorage 기반 세션 관리
- 비밀번호 필드 숨김 처리

#### **프로덕션 배포 시 필수 작업**
```bash
# Vercel Environment Variables에서 설정
NEXT_PUBLIC_ADMIN_PASSWORD=YourVeryStrongPassword2024!
```

#### **권장 비밀번호 규칙**
- 최소 12자 이상
- 대문자 + 소문자 + 숫자 + 특수문자 조합
- 예: `AdminOverwatch2024!@#`

---

### ⚠️ 4. 알려진 보안 고려사항

#### **제한사항**
1. **관리자 인증**: 현재 단순 비밀번호 방식
   - 개선안: JWT 토큰 기반 인증 또는 OAuth
   
2. **Rate Limiting**: 메모리 기반 (서버 재시작 시 초기화)
   - 개선안: Redis 기반 분산 Rate Limiting

3. **CSRF 보호**: Next.js 기본 제공 (SameSite 쿠키)
   - 추가 보안 필요 시 CSRF 토큰 구현

#### **Supabase RLS (Row Level Security)**
- Supabase 대시보드에서 RLS 정책 확인
- 민감한 테이블에 RLS 활성화 권장
- `SUPABASE_SERVICE_ROLE_KEY`는 RLS 우회하므로 조심히 사용

---

### 🛡️ 5. IDOR 방어 및 권한 검증

### **구현된 보안 기능**
```typescript
✅ 서버 측 세션 검증 (DB에서 확인)
✅ 그룹 멤버십 검증 (실제 멤버인지 DB 확인)
✅ 리더 권한 검증 (관리자 작업 시)
✅ 프로필 소유권 검증
✅ 타겟 멤버십 검증 (킥 등)
```

### **방어 메커니즘**
```typescript
// ❌ 취약한 코드 (클라이언트 값 신뢰)
if (sessionId === leaderSessionId) {
  // 킥 허용 - 위험! sessionId는 변조 가능
}

// ✅ 안전한 코드 (서버 측 DB 검증)
const leaderCheck = await validateGroupLeadership(groupId, leaderSessionId);
if (!leaderCheck.valid) {
  return createForbiddenError('권한이 없습니다.');
}
```

### **민감 정보 보호**
```typescript
✅ sessionId는 API 응답에 포함하지 않음
✅ 배틀태그 부분 마스킹 (프로덕션)
   - TestUser#1234 → Test****#1234
✅ 프로필 ID, 만료 시간 등 내부 정보 숨김
```

## 📋 6. 보안 테스트 체크리스트

#### **배포 전 필수 테스트**
```bash
# 1. 환경변수 확인
✅ SUPABASE_SERVICE_ROLE_KEY가 코드에 하드코딩되지 않았는지 확인
✅ .env.local 파일이 .gitignore에 포함되었는지 확인
✅ 기본 비밀번호가 변경되었는지 확인

# 2. API 보안 테스트
✅ SQL Injection 시도 ('; DROP TABLE users;--)
✅ XSS 시도 (<script>alert('XSS')</script>)
✅ Rate Limiting 테스트 (연속 요청)
✅ 잘못된 UUID 입력 테스트

# 3. 관리자 페이지 테스트
✅ 비밀번호 없이 접근 차단 확인
✅ 잘못된 비밀번호 입력 시 에러 메시지 확인
✅ 로그아웃 후 페이지 접근 차단 확인

# 4. IDOR 취약점 테스트 (중요!)
✅ 다른 사용자의 sessionId로 킥 시도 → 403 Forbidden
✅ 다른 그룹의 groupId로 멤버 조작 시도 → 403 Forbidden
✅ 리더가 아닌데 킥 시도 → 403 Forbidden
✅ 그룹 멤버가 아닌데 나가기 시도 → 403 Forbidden
✅ API 응답에 sessionId 포함 여부 확인 → 없어야 함
✅ 배틀태그 마스킹 확인 (프로덕션) → Test****#1234

# 5. Burp Suite 테스트
✅ 요청 가로채기 후 sessionId 변조 시도
✅ groupId 변조하여 다른 그룹 접근 시도
✅ 권한 없는 작업 시도 (킥, 설정 변경 등)
```

---

### 🚀 6. 프로덕션 배포 절차

#### **Step 1: 환경변수 설정**
```bash
# Vercel Dashboard에서 설정
1. NEXT_PUBLIC_SUPABASE_URL
2. NEXT_PUBLIC_SUPABASE_ANON_KEY
3. SUPABASE_SERVICE_ROLE_KEY (서버 전용!)
4. NEXT_PUBLIC_ADMIN_PASSWORD (강력한 비밀번호!)
```

#### **Step 2: Supabase 보안 설정**
```sql
-- RLS 활성화 (필요 시)
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- 관리자만 조회 가능하도록 정책 설정
CREATE POLICY "Admins can view all inquiries"
ON inquiries FOR SELECT
USING (auth.role() = 'authenticated');
```

#### **Step 3: 배포 및 검증**
```bash
# 1. 빌드 테스트
npm run build

# 2. Vercel 배포
git push origin main

# 3. 배포 후 검증
- ✅ 홈페이지 로드 확인
- ✅ 프로필 생성 테스트
- ✅ 그룹 매칭 테스트
- ✅ 문의 작성 테스트
- ✅ 관리자 로그인 테스트
```

---

### 📊 7. 보안 모니터링

#### **로그 확인**
```bash
# Vercel Logs에서 확인
- API 요청 로그
- 에러 발생 로그
- Rate Limit 초과 로그
```

#### **주기적 확인 항목**
- [ ] 의심스러운 Rate Limit 패턴
- [ ] SQL Injection 시도 로그
- [ ] XSS 공격 시도 로그
- [ ] 관리자 로그인 실패 로그

---

### 🔒 8. 긴급 대응 가이드

#### **보안 사고 발생 시**
1. **즉시 조치**
   - Vercel에서 배포 롤백
   - 환경변수 변경 (특히 `SUPABASE_SERVICE_ROLE_KEY`)
   - Supabase에서 의심스러운 쿼리 확인

2. **조사**
   - Vercel Logs 확인
   - Supabase Logs 확인
   - 영향 받은 데이터 범위 확인

3. **복구**
   - 취약점 수정
   - 새 버전 배포
   - 사용자 공지 (필요 시)

---

### 📚 9. 추가 보안 개선 권장사항

#### **단기 개선 (1-2주)**
- [ ] JWT 기반 관리자 인증
- [ ] HTTPS 강제 리다이렉트
- [ ] Content Security Policy (CSP) 헤더 추가

#### **중기 개선 (1-2개월)**
- [ ] Redis 기반 Rate Limiting
- [ ] OAuth 2.0 소셜 로그인
- [ ] 2FA (Two-Factor Authentication)
- [ ] 웹훅 서명 검증

#### **장기 개선 (3-6개월)**
- [ ] 보안 감사 도구 통합 (OWASP ZAP, Snyk)
- [ ] 침투 테스트
- [ ] 버그 바운티 프로그램

---

## 📞 보안 문의

보안 취약점을 발견하셨나요?
- **긴급**: 즉시 서비스 중단 및 패치
- **일반**: GitHub Issues에 보안 태그로 보고

**절대 공개 채널에 취약점을 공개하지 마세요!**

---

**마지막 업데이트**: 2025-01-25  
**작성자**: AI Assistant  
**문서 버전**: 1.0
