# 🔍 수동 데이터 삽입 테스트

## Supabase에서 직접 데이터 삽입 테스트

### Step 1: Supabase SQL Editor 접속
https://supabase.com/dashboard/project/zdnewnjvmthowbhpnkqc/editor

### Step 2: 다음 SQL 실행

```sql
-- 1. RLS 상태 확인
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('groups', 'group_members', 'temporary_profiles');

-- 2. 테스트 데이터 삽입
INSERT INTO groups (
  leader_session_id,
  tank_count,
  damage_count,
  support_count,
  total_members,
  status
) VALUES (
  'manual-test-session-' || NOW()::text,
  0,
  0,
  1,
  1,
  'waiting'
) RETURNING *;

-- 3. 데이터 확인
SELECT * FROM groups ORDER BY created_at DESC LIMIT 5;

-- 4. 데이터 개수 확인
SELECT COUNT(*) as total_groups FROM groups;
```

### Step 3: 결과 해석

**성공 시**:
- INSERT 문이 1 row를 반환
- SELECT 문에서 방금 삽입한 데이터 확인
- COUNT가 1 이상

**실패 시**:
- 에러 메시지 표시
- 가능한 에러:
  - `permission denied` → RLS 여전히 활성화
  - `column does not exist` → 스키마 문제
  - `violates check constraint` → 데이터 검증 실패

---

## 예상되는 문제

### 문제 1: 테이블이 존재하지 않음
```sql
-- 테이블 존재 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('groups', 'group_members', 'temporary_profiles');
```

### 문제 2: 컬럼 이름 불일치
```sql
-- groups 테이블 스키마 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'groups'
ORDER BY ordinal_position;
```

### 문제 3: RLS가 여전히 활성화
```sql
-- RLS 완전 비활성화 재시도
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE temporary_profiles DISABLE ROW LEVEL SECURITY;
```

---

## 디버그 체크리스트

실행 후 다음을 확인:
- [ ] RLS 상태: `rowsecurity: false` (모든 테이블)
- [ ] INSERT 성공 여부
- [ ] SELECT로 데이터 조회 가능
- [ ] COUNT가 0이 아님

---

**이 테스트를 실행하고 결과를 알려주세요!**
