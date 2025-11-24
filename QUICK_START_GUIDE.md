# ⚡ 그룹 생성 문제 즉시 해결 가이드

## 🚨 현재 상황

**증상**: 그룹을 생성해도 데이터베이스에 저장되지 않음
- Debug API: `count: 0`, `groups: []`
- 앱: "그룹 매칭 실패" 또는 404 오류

**원인**: Supabase RLS (Row Level Security) 정책이 데이터 삽입을 차단

---

## ⚡ 즉시 해결 (2가지 방법)

### 🔥 방법 1: Supabase RLS 비활성화 (5초 소요, 가장 빠름!)

#### 단계:
1. **Supabase SQL Editor 접속**:
   https://supabase.com/dashboard/project/zdnewnjvmthowbhpnkqc/editor

2. **아래 SQL 복사해서 붙여넣기**:
   ```sql
   ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
   ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
   ALTER TABLE temporary_profiles DISABLE ROW LEVEL SECURITY;
   ```

3. **Run 버튼 클릭** (오른쪽 하단)

4. **즉시 테스트**:
   - 앱에서 그룹 생성 시도
   - Debug API 확인: https://find-group.vercel.app/api/group/debug

#### 결과:
- ✅ 즉시 적용 (재배포 불필요)
- ✅ 모든 데이터베이스 작업 허용
- ⚠️ 프로덕션에서는 보안 취약 (임시 해결책)

---

### 🔐 방법 2: Vercel 환경 변수 추가 (권장, 보안 유지)

#### 단계:

**Step 1: Supabase Service Role Key 복사**
1. Supabase Dashboard 접속: https://supabase.com/dashboard/project/zdnewnjvmthowbhpnkqc
2. **Settings** → **API** 클릭
3. **Project API keys** 섹션에서 `service_role` secret 복사

**Step 2: Vercel 환경 변수 추가**
1. Vercel Dashboard 접속: https://vercel.com/dashboard
2. 프로젝트 선택 → **Settings** → **Environment Variables**
3. **Add New** 클릭:
   - **Name**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: `{복사한 service_role key}`
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development (모두 체크)
4. **Save** → 자동 재배포 대기 (1-2분)

**Step 3: 배포 완료 확인**
1. Vercel Deployments 페이지에서 "Building" → "Ready" 확인
2. 환경 변수 확인 API: https://find-group.vercel.app/api/env-check
   ```json
   {
     "recommendation": {
       "canUseServiceRole": true,  ← ✅ true여야 함!
       "message": "✅ Service Role Key가 설정되어 있습니다."
     }
   }
   ```
3. 앱 테스트

#### 결과:
- ✅ 보안 유지 (RLS 우회하지만 서버 전용)
- ✅ 프로덕션 환경에 적합
- ⏳ 재배포 필요 (1-2분)

---

## 🧪 테스트 방법

### 1. Debug API로 확인
```bash
curl https://find-group.vercel.app/api/group/debug
```

**정상 응답** (그룹 생성 후):
```json
{
  "rawQuery": {
    "count": 1,              ← ✅ 1 이상!
    "groups": [...]
  }
}
```

### 2. 환경 변수 확인 (방법 2 선택 시)
```bash
curl https://find-group.vercel.app/api/env-check
```

**정상 응답**:
```json
{
  "server": {
    "hasServiceRoleKey": true,  ← ✅ true!
    "serviceRoleKeyLength": 200+
  },
  "recommendation": {
    "canUseServiceRole": true,
    "message": "✅ Service Role Key가 설정되어 있습니다."
  }
}
```

### 3. 앱에서 실제 테스트
1. https://find-group.vercel.app 접속
2. **Start quick group matching** 버튼 클릭
3. 닉네임 입력, 역할 선택
4. **"그룹장으로 시작하기"** 클릭

**예상 결과**:
- ✅ "대기 중인 그룹원들..." 화면
- ✅ 그룹 ID 표시
- ✅ 역할 통계 업데이트

---

## 🎯 권장 순서

### 즉시 해결 필요 시:
1. **방법 1 (RLS 비활성화)** 실행
2. 앱 테스트
3. 나중에 **방법 2 (환경 변수)** 또는 RLS 정책 추가

### 프로덕션 준비:
1. **방법 2 (환경 변수)** 실행
2. 또는 RLS 정책 추가 (아래 참고)

---

## 📝 RLS 정책 추가 (선택사항, 보안 강화)

**Supabase SQL Editor에서 실행**:

```sql
-- groups 테이블 정책
CREATE POLICY "Anyone can manage groups"
ON groups FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- group_members 테이블 정책
CREATE POLICY "Anyone can manage members"
ON group_members FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- temporary_profiles 테이블 정책
CREATE POLICY "Anyone can manage profiles"
ON temporary_profiles FOR ALL
TO public
USING (true)
WITH CHECK (true);
```

**정책 추가 후 RLS 재활성화**:
```sql
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporary_profiles ENABLE ROW LEVEL SECURITY;
```

---

## 🔍 Vercel Functions 로그 확인

**실제 에러 메시지 보기**:

1. Vercel Dashboard → Deployments → 최신 배포 클릭
2. **Functions** 탭 → `/api/group/create` 클릭
3. Logs 섹션에서 에러 확인:
   ```
   [GroupService] Supabase 초기화: {
     keyType: 'service_role' 또는 'anon',
     hasServiceKey: true 또는 false
   }
   
   [GroupService] 그룹 생성 실패: {에러 메시지}
   ```

**일반적인 에러**:
- `new row violates row-level security policy` → RLS 문제
- `permission denied` → 권한 문제
- `keyType: 'anon', hasServiceKey: false` → 환경 변수 미설정

---

## 📊 비교표

| 항목 | 방법 1 (RLS 비활성화) | 방법 2 (환경 변수) |
|------|----------------------|-------------------|
| **속도** | ⚡ 5초 | ⏱️ 1-2분 (재배포) |
| **재배포 필요** | ❌ 없음 | ✅ 필요 |
| **보안** | ⚠️ 취약 (임시용) | ✅ 안전 |
| **프로덕션 사용** | ❌ 비권장 | ✅ 권장 |
| **복잡도** | ✅ 매우 간단 | 🟡 보통 |

---

## ✅ 체크리스트

**방법 1 (RLS 비활성화)**:
- [ ] Supabase SQL Editor 접속
- [ ] RLS 비활성화 SQL 실행
- [ ] 앱에서 그룹 생성 테스트
- [ ] Debug API: `count: 1+` 확인

**방법 2 (환경 변수)**:
- [ ] Supabase Service Role Key 복사
- [ ] Vercel 환경 변수 추가
- [ ] 재배포 완료 대기
- [ ] Env Check API: `hasServiceRoleKey: true` 확인
- [ ] 앱에서 그룹 생성 테스트

---

## 📞 주요 링크

- **Supabase SQL Editor**: https://supabase.com/dashboard/project/zdnewnjvmthowbhpnkqc/editor
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Debug API**: https://find-group.vercel.app/api/group/debug
- **Env Check API**: https://find-group.vercel.app/api/env-check (재배포 후 사용 가능)

---

## 💡 권장 사항

**지금 당장 테스트가 필요하다면**:
→ **방법 1 (RLS 비활성화)** 사용 (5초 소요)

**프로덕션 배포가 목표라면**:
→ **방법 2 (환경 변수)** 사용 (안전하고 권장)

**두 가지 모두 시도**:
1. 먼저 방법 1로 즉시 테스트
2. 확인 후 방법 2로 프로덕션 환경 구축

---

**📌 가장 빠른 해결책**: 지금 바로 Supabase SQL Editor에서 RLS 비활성화 SQL 실행! ⚡
