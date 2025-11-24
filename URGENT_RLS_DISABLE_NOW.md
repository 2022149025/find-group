# 🚨 긴급: Supabase RLS 즉시 비활성화 필요

## 현재 상황

**증상**:
- ✅ 대기실 화면은 보임
- ✅ Service Role Key 설정 완료 (`hasServiceRoleKey: true`)
- ❌ **Supabase에 데이터가 저장되지 않음** (`count: 0`)

**원인**:
Service Role Key가 설정되었지만, 코드에서 제대로 사용되지 않거나 RLS 정책이 여전히 차단하고 있습니다.

---

## ⚡ 즉시 해결: RLS 비활성화 (5초 소요)

### Step 1: Supabase SQL Editor 접속
👉 https://supabase.com/dashboard/project/zdnewnjvmthowbhpnkqc/editor

### Step 2: 다음 SQL 복사 → 붙여넣기
```sql
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE temporary_profiles DISABLE ROW LEVEL SECURITY;
```

### Step 3: Run 버튼 클릭
- 우측 하단 또는 상단의 **Run** 버튼 클릭
- "Success" 메시지 확인

### Step 4: 즉시 테스트
1. 앱 새로고침: https://find-group.vercel.app
2. 다시 그룹 생성 시도
3. Debug API 확인:
   ```bash
   curl https://find-group.vercel.app/api/group/debug
   ```
4. `count: 1` 이상이면 성공!

---

## 🔍 RLS 상태 확인 (선택사항)

**현재 RLS 상태 확인**:
```sql
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('groups', 'group_members', 'temporary_profiles');
```

**결과**:
- `rowsecurity: true` → RLS 활성화 (정책 필요)
- `rowsecurity: false` → RLS 비활성화 (모든 작업 허용)

---

## 🧪 테스트 데이터 수동 삽입

**RLS 비활성화 후 수동 테스트**:
```sql
-- 테스트 그룹 생성
INSERT INTO groups (
  leader_session_id,
  tank_count,
  damage_count,
  support_count,
  total_members,
  status
) VALUES (
  'manual-test-' || NOW()::text,
  0,
  0,
  1,
  1,
  'waiting'
);

-- 확인
SELECT * FROM groups ORDER BY created_at DESC LIMIT 5;
```

**성공 시**: 테이블에 데이터가 나타남
**실패 시**: RLS 정책 에러 메시지

---

## 📊 예상 결과

### RLS 비활성화 전
```json
// Debug API
{
  "rawQuery": {
    "count": 0,              // ❌
    "groups": []
  }
}
```

### RLS 비활성화 후
```json
// Debug API
{
  "rawQuery": {
    "count": 1,              // ✅
    "groups": [
      {
        "id": "...",
        "status": "waiting",
        "support_count": 1
      }
    ]
  }
}
```

---

## ⚠️ 왜 Service Role Key로도 안 되나요?

**가능한 원인**:

1. **코드 로직 문제**: 
   - `GroupService` 생성자에서 Service Role Key를 사용하지만
   - 클라이언트 사이드에서 생성된 경우 여전히 Anon Key 사용

2. **RLS 정책이 Service Role도 차단**:
   - 일부 RLS 정책은 Service Role Key도 제한할 수 있음

3. **Vercel Functions에서 키가 전달되지 않음**:
   - 환경 변수가 설정되었지만 런타임에 접근 실패

**해결책**: 
- RLS를 완전히 비활성화하면 키와 무관하게 모든 작업 허용
- 나중에 RLS 정책을 제대로 설정할 수 있음

---

## 🎯 즉시 실행 체크리스트

- [ ] Supabase SQL Editor 접속
- [ ] RLS 비활성화 SQL 실행
- [ ] "Success" 메시지 확인
- [ ] 앱 새로고침 → 그룹 생성 시도
- [ ] Debug API: `count: 1+` 확인
- [ ] Supabase Table Editor에서 데이터 확인

---

## 📞 Quick Links

- **Supabase SQL Editor**: https://supabase.com/dashboard/project/zdnewnjvmthowbhpnkqc/editor
- **Supabase Table Editor**: https://supabase.com/dashboard/project/zdnewnjvmthowbhpnkqc/editor
- **Debug API**: https://find-group.vercel.app/api/group/debug
- **앱 URL**: https://find-group.vercel.app

---

**지금 바로 Supabase SQL Editor에서 RLS 비활성화 SQL을 실행하세요!** ⚡

실행 후 결과를 알려주시면, 제가 즉시 확인하겠습니다!
