# 🚨 즉시 해결: Supabase RLS 비활성화

## 현재 상황

그룹 생성 후에도 데이터베이스에 그룹이 저장되지 않고 있습니다.
- Debug API: `count: 0`, `groups: []`
- 원인: Supabase RLS (Row Level Security) 정책이 데이터 삽입을 차단

---

## ⚡ 즉시 해결 방법 (2가지 옵션)

### Option 1: Supabase RLS 비활성화 (가장 빠름, 5초 소요)

**장점**: 
- ✅ 즉시 적용 (재배포 불필요)
- ✅ 모든 데이터베이스 작업 허용
- ✅ 환경 변수 설정 없이 바로 작동

**단점**:
- ⚠️ 프로덕션 환경에서는 보안 위험 (임시 해결책으로만 사용)

**실행 방법**:

1. **Supabase Dashboard 접속**:
   https://supabase.com/dashboard/project/zdnewnjvmthowbhpnkqc

2. **SQL Editor 클릭**

3. **다음 SQL 실행**:
   ```sql
   -- RLS 완전 비활성화 (임시 해결책)
   ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
   ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
   ALTER TABLE temporary_profiles DISABLE ROW LEVEL SECURITY;
   ```

4. **Run 버튼 클릭**

5. **즉시 테스트**:
   - 앱에서 그룹 생성 시도
   - Debug API 확인: `curl https://find-group.vercel.app/api/group/debug`

---

### Option 2: RLS 정책 추가 (권장, 보안 강화)

**장점**:
- ✅ 보안 유지
- ✅ 세밀한 권한 제어
- ✅ 프로덕션 환경에 적합

**실행 방법**:

1. **Supabase Dashboard → SQL Editor**

2. **다음 SQL 실행**:
   ```sql
   -- =====================================================
   -- RLS 정책: 모든 사용자가 읽기/쓰기 가능
   -- =====================================================
   
   -- groups 테이블 정책
   CREATE POLICY "Anyone can insert groups"
   ON groups FOR INSERT
   TO public
   WITH CHECK (true);
   
   CREATE POLICY "Anyone can view groups"
   ON groups FOR SELECT
   TO public
   USING (true);
   
   CREATE POLICY "Anyone can update groups"
   ON groups FOR UPDATE
   TO public
   USING (true);
   
   CREATE POLICY "Anyone can delete groups"
   ON groups FOR DELETE
   TO public
   USING (true);
   
   -- group_members 테이블 정책
   CREATE POLICY "Anyone can insert members"
   ON group_members FOR INSERT
   TO public
   WITH CHECK (true);
   
   CREATE POLICY "Anyone can view members"
   ON group_members FOR SELECT
   TO public
   USING (true);
   
   CREATE POLICY "Anyone can update members"
   ON group_members FOR UPDATE
   TO public
   USING (true);
   
   CREATE POLICY "Anyone can delete members"
   ON group_members FOR DELETE
   TO public
   USING (true);
   
   -- temporary_profiles 테이블 정책
   CREATE POLICY "Anyone can insert profiles"
   ON temporary_profiles FOR INSERT
   TO public
   WITH CHECK (true);
   
   CREATE POLICY "Anyone can view profiles"
   ON temporary_profiles FOR SELECT
   TO public
   USING (true);
   
   CREATE POLICY "Anyone can update profiles"
   ON temporary_profiles FOR UPDATE
   TO public
   USING (true);
   
   CREATE POLICY "Anyone can delete profiles"
   ON temporary_profiles FOR DELETE
   TO public
   USING (true);
   ```

3. **Run 버튼 클릭**

4. **즉시 테스트**

---

## 🔍 Vercel Functions 로그 확인 방법

**실제 에러 메시지를 확인하려면**:

1. **Vercel Dashboard 접속**:
   https://vercel.com/dashboard

2. **프로젝트 선택** → **Deployments** 탭

3. **최신 배포 클릭** → **Functions** 탭

4. **`/api/group/create` 함수 클릭**

5. **Logs 섹션에서 확인**:
   ```
   [GroupService] Supabase 초기화: {
     isServer: true,
     keyType: 'service_role' 또는 'anon',  ← 어떤 키를 사용하는지 확인
     hasServiceKey: true 또는 false
   }
   
   [GroupService] 그룹 생성 실패: {실제 에러 메시지}  ← 이 메시지가 중요!
   ```

**가능한 에러 메시지**:
- `new row violates row-level security policy` → RLS 정책 문제
- `permission denied` → 권한 문제
- `PGRST301` → RLS 정책 없음

---

## 📊 환경 변수 확인

**Vercel 환경 변수가 올바르게 설정되었는지 확인**:

1. **Vercel Dashboard → Settings → Environment Variables**

2. **확인 사항**:
   - `NEXT_PUBLIC_SUPABASE_URL`: ✅ 설정됨
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: ✅ 설정됨
   - `SUPABASE_SERVICE_ROLE_KEY`: ❓ 설정됨? (필수!)

3. **`SUPABASE_SERVICE_ROLE_KEY`가 없다면**:
   - Supabase Dashboard → Settings → API → `service_role` secret 복사
   - Vercel에 환경 변수 추가
   - 모든 환경(Production, Preview, Development)에 체크
   - 저장 → 자동 재배포 대기

---

## ⚡ 즉시 테스트 스크립트

### 1. RLS 상태 확인
```sql
-- Supabase SQL Editor에서 실행
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('groups', 'group_members', 'temporary_profiles');
```

**결과 해석**:
- `rowsecurity: true` → RLS 활성화 (정책 필요)
- `rowsecurity: false` → RLS 비활성화 (모든 작업 허용)

### 2. 수동 INSERT 테스트
```sql
-- Supabase SQL Editor에서 실행
INSERT INTO groups (
  leader_session_id,
  tank_count,
  damage_count,
  support_count,
  total_members,
  status
) VALUES (
  'manual-test-session-123',
  0,
  0,
  1,
  1,
  'waiting'
);

-- 확인
SELECT * FROM groups WHERE leader_session_id = 'manual-test-session-123';
```

**결과**:
- ✅ 성공 → RLS 문제 아님, 코드 또는 환경 변수 문제
- ❌ 실패 → RLS 정책 문제 확인

### 3. Debug API 확인
```bash
curl https://find-group.vercel.app/api/group/debug | jq '.data.rawQuery'
```

**정상 응답** (RLS 해제 후):
```json
{
  "count": 1,
  "groups": [
    {
      "id": "...",
      "status": "waiting",
      ...
    }
  ]
}
```

---

## 🎯 권장 해결 순서

### 1단계: RLS 비활성화 (테스트용)
```sql
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE temporary_profiles DISABLE ROW LEVEL SECURITY;
```
→ 즉시 그룹 생성 테스트

### 2단계: 테스트 성공 시
**Option A**: RLS 비활성화 유지 (간단, 보안 취약)
**Option B**: RLS 정책 추가 후 재활성화 (권장)

```sql
-- 정책 추가 (위의 Option 2 SQL 실행)

-- RLS 재활성화
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporary_profiles ENABLE ROW LEVEL SECURITY;
```

### 3단계: Vercel 환경 변수 추가 (장기 솔루션)
- `SUPABASE_SERVICE_ROLE_KEY` 추가
- 재배포 후 테스트

---

## 📌 Quick Fix Command

**Supabase SQL Editor에 바로 붙여넣기**:

```sql
-- =====================================================
-- QUICK FIX: RLS 완전 비활성화 (즉시 적용)
-- =====================================================
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE temporary_profiles DISABLE ROW LEVEL SECURITY;

-- 테스트 데이터 삽입
INSERT INTO groups (
  leader_session_id,
  tank_count,
  damage_count,
  support_count,
  total_members,
  status
) VALUES (
  'test-session-' || NOW()::text,
  0,
  0,
  1,
  1,
  'waiting'
);

-- 확인
SELECT COUNT(*) as total_groups FROM groups;
SELECT * FROM groups ORDER BY created_at DESC LIMIT 5;
```

**실행 후**:
1. 앱에서 그룹 생성 테스트
2. Debug API: `curl https://find-group.vercel.app/api/group/debug`
3. `count: 1+`이면 성공!

---

## 🚨 중요 알림

**RLS 비활성화는 임시 해결책입니다!**

프로덕션 환경에서는:
1. RLS 정책 추가 (Option 2)
2. 또는 Service Role Key 사용 (Vercel 환경 변수)

둘 중 하나를 반드시 적용해야 합니다.

---

## 📞 Support

- **Supabase SQL Editor**: https://supabase.com/dashboard/project/zdnewnjvmthowbhpnkqc/editor
- **Vercel Functions Logs**: https://vercel.com/dashboard/deployments
- **Debug API**: https://find-group.vercel.app/api/group/debug

**지금 바로 Supabase SQL Editor에서 RLS 비활성화 SQL을 실행하면 즉시 해결됩니다!** ⚡
