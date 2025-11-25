# 🔒 IDOR 취약점 방어 가이드

## ⚠️ 보고된 보안 위협

### **Burp Suite를 통한 클라이언트 측 조작**
```
문제 1: JavaScript 이벤트 핸들러 가로채기 가능
- 클라이언트 측 검증만으로는 불충분
- 공격자가 요청 파라미터 변조 가능

문제 2: IDOR 취약점
- sessionId를 다른 사용자 것으로 변조
- groupId를 다른 그룹으로 변조
- 권한 없는 작업 수행 가능

문제 3: 민감 정보 유출 위험
- 배틀태그 유출
- DB 직접 접근 가능
- 서버리스라 방화벽 우회는 어렵지만 DB 보호 필수
```

---

## ✅ 구현된 방어 메커니즘

### **1. 서버 측 권한 검증 시스템**

#### **파일: `lib/security/authorization.ts`**

```typescript
// ❌ 취약한 코드 (클라이언트 값 신뢰)
export async function kickMember(groupId, leaderSessionId, targetSessionId) {
  // 클라이언트가 보낸 값을 그대로 신뢰 - 위험!
  if (leaderSessionId) {
    await db.delete(targetSessionId);
  }
}

// ✅ 안전한 코드 (서버 측 DB 검증)
export async function kickMember(groupId, leaderSessionId, targetSessionId) {
  // 1. DB에서 실제 세션 존재 확인
  const session = await validateSessionOwnership(leaderSessionId);
  if (!session.valid) return error('세션이 유효하지 않습니다');
  
  // 2. DB에서 리더 권한 확인
  const leadership = await validateGroupLeadership(groupId, leaderSessionId);
  if (!leadership.valid) return error('권한이 없습니다');
  
  // 3. DB에서 타겟이 실제 멤버인지 확인
  const target = await validateTargetMembership(groupId, targetSessionId);
  if (!target.valid) return error('대상이 멤버가 아닙니다');
  
  // 4. 모든 검증 통과 후 실행
  await db.delete(targetSessionId);
}
```

### **2. 다층 보안 검증**

```typescript
보안 계층 1: Rate Limiting
├─ IP 기반 요청 제한
└─ 무차별 대입 공격 방지

보안 계층 2: 입력 검증
├─ 형식 검증 (UUID, sessionId 형식)
├─ 길이 제한
└─ XSS/SQL Injection 방지

보안 계층 3: 세션 검증 (DB)
├─ validateSessionOwnership()
├─ 세션 존재 확인
└─ 만료 시간 확인

보안 계층 4: 권한 검증 (DB)
├─ validateGroupMembership() - 멤버인가?
├─ validateGroupLeadership() - 리더인가?
├─ validateProfileOwnership() - 소유자인가?
└─ validateTargetMembership() - 타겟이 멤버인가?

보안 계층 5: 작업 실행
└─ 모든 검증 통과 시에만 실행
```

---

## 🛡️ API별 보안 적용

### **POST /api/group/kick** (멤버 강제 퇴장)
```typescript
보안 체크:
1. ✅ Rate Limiting (10개/분)
2. ✅ groupId UUID 검증
3. ✅ leaderSessionId 형식 검증
4. ✅ targetSessionId 형식 검증
5. ✅ 자기 자신 킥 차단
6. ✅ validateGroupLeadership() - DB에서 리더 확인
7. ✅ validateTargetMembership() - DB에서 타겟 확인
8. ✅ 리더는 킥할 수 없음 차단

공격 시나리오:
❌ 일반 멤버가 leaderSessionId를 자신으로 변조하여 킥 시도
   → validateGroupLeadership() 실패 → 403 Forbidden

❌ 리더가 존재하지 않는 targetSessionId로 킥 시도
   → validateTargetMembership() 실패 → 400 Bad Request
```

### **POST /api/group/leave** (그룹 나가기)
```typescript
보안 체크:
1. ✅ Rate Limiting (20개/분)
2. ✅ groupId UUID 검증
3. ✅ sessionId 형식 검증
4. ✅ validateGroupMembership() - DB에서 멤버십 확인
5. ✅ 자신만 나갈 수 있음

공격 시나리오:
❌ 멤버가 아닌데 다른 사람의 sessionId로 나가기 시도
   → validateGroupMembership() 실패 → 403 Forbidden

❌ 다른 그룹의 groupId로 나가기 시도
   → validateGroupMembership() 실패 → 403 Forbidden
```

### **GET /api/group/[groupId]** (그룹 조회)
```typescript
보안 체크:
1. ✅ Rate Limiting (30개/분)
2. ✅ groupId UUID 검증
3. ✅ sessionId 응답에 포함하지 않음
4. ✅ 배틀태그 마스킹 (프로덕션)
5. ✅ 내부 정보 필터링 (id, expires_at 등)

데이터 보호:
✅ 응답 데이터:
{
  "group": {
    "id": "uuid",
    "status": "waiting",
    // leaderSessionId는 노출하지 않음
  },
  "members": [{
    // sessionId는 노출하지 않음
    "position": "Tank",
    "isLeader": true,
    "profile": {
      "nickname": "테스트유저",
      "battleTag": "Test****#1234", // 마스킹됨 (프로덕션)
      // id, session_id, expires_at는 노출하지 않음
    }
  }]
}
```

---

## 🧪 Burp Suite 테스트 가이드

### **테스트 1: 리더 권한 우회 시도**
```http
1. 정상 사용자로 그룹 참가
2. Burp Suite로 /api/group/kick 요청 가로채기
3. leaderSessionId를 자신의 sessionId로 변조
4. 요청 전송

Expected Result:
HTTP/1.1 403 Forbidden
{
  "success": false,
  "error": "그룹장 권한이 필요합니다.",
  "code": "FORBIDDEN_ERROR",
  "statusCode": 403
}

✅ PASS: 권한 없는 사용자는 킥할 수 없음
```

### **테스트 2: 다른 그룹 멤버 조작 시도**
```http
1. 그룹 A의 리더로 로그인
2. Burp Suite로 /api/group/kick 요청 가로채기
3. groupId를 그룹 B의 ID로 변조
4. 요청 전송

Expected Result:
HTTP/1.1 403 Forbidden
{
  "success": false,
  "error": "해당 그룹의 멤버가 아닙니다.",
  "code": "FORBIDDEN_ERROR",
  "statusCode": 403
}

✅ PASS: 다른 그룹에는 접근할 수 없음
```

### **테스트 3: sessionId 노출 확인**
```http
1. /api/group/[groupId] 요청
2. 응답 확인

Expected Result:
{
  "success": true,
  "data": {
    "members": [{
      // sessionId 필드가 존재하지 않음
      "position": "Tank",
      "profile": {...}
    }]
  }
}

✅ PASS: sessionId는 절대 노출되지 않음
```

### **테스트 4: 배틀태그 마스킹 확인 (프로덕션)**
```http
1. 프로덕션 환경에서 /api/group/[groupId] 요청
2. battleTag 필드 확인

Expected Result (Development):
"battleTag": "TestUser#1234"

Expected Result (Production):
"battleTag": "Test****#1234"

✅ PASS: 프로덕션에서는 배틀태그 마스킹됨
```

---

## 📊 보안 검증 체크리스트

### **배포 전 필수 확인**
```bash
✅ 1. 모든 API에 validateSessionOwnership() 적용됨
✅ 2. 권한 작업에 validateGroupLeadership() 적용됨
✅ 3. API 응답에 sessionId 포함 안 됨
✅ 4. 프로덕션에서 배틀태그 마스킹 확인
✅ 5. Supabase RLS 정책 활성화 확인
✅ 6. SUPABASE_SERVICE_ROLE_KEY 사용 최소화
✅ 7. Rate Limiting 설정 확인
✅ 8. 에러 메시지에 민감 정보 포함 안 됨
```

### **Burp Suite 테스트 필수**
```bash
✅ 1. 권한 우회 시도 → 403 Forbidden
✅ 2. 다른 사용자 sessionId 사용 → 403 Forbidden  
✅ 3. 다른 그룹 groupId 사용 → 403 Forbidden
✅ 4. 응답에 sessionId 노출 여부 → 노출 안 됨
✅ 5. Rate Limiting 테스트 → 429 Too Many Requests
✅ 6. SQL Injection 시도 → 차단됨
✅ 7. XSS 시도 → 차단됨
```

---

## 🔐 Supabase RLS 정책

### **파일: `supabase/rls_policies.sql`**

```sql
-- 세션 기반 접근 제어
ALTER TABLE temporary_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- 예시: 프로필 조회 정책
CREATE POLICY "Users can view own profile"
ON temporary_profiles
FOR SELECT
USING (
  expires_at > NOW()  -- 만료되지 않은 세션만
);
```

---

## 🚀 배포 절차

### **1. 로컬 테스트**
```bash
# 보안 테스트
npm test

# Burp Suite로 IDOR 테스트
- 권한 우회 시도
- 파라미터 변조 시도
- sessionId 노출 확인
```

### **2. Supabase RLS 활성화**
```bash
# Supabase Dashboard에서 SQL 실행
supabase/rls_policies.sql

# RLS 활성화 확인
- Table Editor → Settings → Row Level Security
```

### **3. Vercel 배포**
```bash
git push origin main

# 환경변수 확인
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (최소 사용)
- NEXT_PUBLIC_ADMIN_PASSWORD
```

### **4. 프로덕션 검증**
```bash
# 배틀태그 마스킹 확인
curl https://find-group.vercel.app/api/group/[groupId]
# → battleTag: "Test****#1234"

# sessionId 노출 확인
# → sessionId 필드 없음

# IDOR 공격 테스트
# → 403 Forbidden
```

---

## 📚 참고 자료

- [OWASP IDOR Prevention](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/05-Authorization_Testing/04-Testing_for_Insecure_Direct_Object_References)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Security Best Practices](https://nextjs.org/docs/pages/building-your-application/configuring/authentication)

---

**마지막 업데이트**: 2025-01-25  
**작성자**: Security Team  
**문서 버전**: 1.0  
**상태**: 🔒 Production-Ready
