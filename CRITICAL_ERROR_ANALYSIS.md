# 🚨 Critical Error Analysis: 그룹 생성 실패 (404 Not Found)

## 📋 Problem Summary

**Error**: 그룹을 생성했지만 해당 그룹을 조회할 수 없음 (404 Not Found)
- **Client Error**: `GET https://find-group.vercel.app/api/group/b62d2d9e-5048-42d6-8707-6153ed2409d3` → `404 (Not Found)`
- **Debug Info**: `waitingGroups: 0`, `totalWaitingGroups: 0` (모든 카운트가 0)

## 🔍 Root Cause Analysis

### Debug API 결과 분석
```json
{
  "environment": {
    "NEXT_PUBLIC_SUPABASE_URL": "https://zdnewnjvmthowbhpnkqc.s...",
    "hasKey": true
  },
  "rawQuery": {
    "count": 0,          // ❌ 데이터베이스에 그룹이 전혀 없음
    "groups": [],
    "error": null
  }
}
```

**결론**: 그룹 생성 API는 클라이언트에서 호출되고 있지만, **Supabase 데이터베이스에 그룹이 전혀 저장되지 않고 있습니다**.

### 💥 Primary Suspects (가능성 높은 순서)

#### 1. ⚠️ **Supabase RLS (Row Level Security) 정책 문제** (90% 확률)
- Supabase에서 테이블에 대한 **INSERT 권한**이 없는 경우
- 환경 변수는 정상이지만, RLS 정책이 익명 사용자의 데이터 삽입을 차단
- 코드에서 `groupError`를 캐치하고 있지만, 클라이언트에서 에러 응답을 제대로 처리하지 못함

#### 2. 🔑 **Supabase Service Role Key 미사용** (70% 확률)
- 현재 코드는 `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 사용 중
- 익명 키는 RLS 정책의 제약을 받음
- **서버 사이드**에서는 `SUPABASE_SERVICE_ROLE_KEY`를 사용해야 RLS를 우회하고 모든 작업 가능

#### 3. 🌐 **Vercel 환경 변수 미설정** (50% 확률)
- `NEXT_PUBLIC_*` 변수는 설정했지만, **서버 전용 변수**를 설정하지 않음
- 클라이언트는 공개 키, 서버는 서비스 롤 키를 사용해야 함

#### 4. 📝 **Supabase 테이블 스키마 문제** (30% 확률)
- 컬럼 타입 불일치 (예: `VARCHAR` vs `UUID`)
- NOT NULL 제약 조건 위반
- FOREIGN KEY 제약 조건 문제

---

## ✅ Immediate Action Plan

### Step 1: Vercel Runtime Logs 확인 (최우선)

**방법**:
1. Vercel Dashboard → 프로젝트 선택
2. **Deployments** 탭 → 최신 배포 클릭
3. **Functions** 탭 → `/api/group/create` 로그 확인

**찾아야 할 것**:
```
[GroupService] 그룹 생성 실패: {실제 에러 메시지}
```

이 로그가 **그룹 생성이 실패한 정확한 이유**를 알려줍니다.

---

### Step 2: Supabase RLS 정책 확인 및 수정

#### Option A: RLS 비활성화 (빠른 테스트용)
```sql
-- Supabase SQL Editor에서 실행
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
```

#### Option B: RLS 정책 추가 (권장)
```sql
-- groups 테이블: 모든 사용자가 INSERT 가능
CREATE POLICY "Anyone can insert groups"
ON groups FOR INSERT
TO anon
WITH CHECK (true);

-- groups 테이블: 모든 사용자가 SELECT 가능
CREATE POLICY "Anyone can view groups"
ON groups FOR SELECT
TO anon
USING (true);

-- groups 테이블: 그룹장만 UPDATE 가능
CREATE POLICY "Leaders can update their groups"
ON groups FOR UPDATE
TO anon
USING (leader_session_id = current_setting('request.jwt.claims')::json->>'sessionId');

-- group_members 테이블: 모든 사용자가 INSERT 가능
CREATE POLICY "Anyone can insert members"
ON group_members FOR INSERT
TO anon
WITH CHECK (true);

-- group_members 테이블: 모든 사용자가 SELECT 가능
CREATE POLICY "Anyone can view members"
ON group_members FOR SELECT
TO anon
USING (true);

-- group_members 테이블: 그룹장만 DELETE 가능 (kick)
CREATE POLICY "Leaders can delete members"
ON group_members FOR DELETE
TO anon
USING (
  group_id IN (
    SELECT id FROM groups WHERE leader_session_id = current_setting('request.jwt.claims')::json->>'sessionId'
  )
);
```

---

### Step 3: Supabase Service Role Key 사용 (권장)

#### 환경 변수 추가
**Vercel Dashboard → Settings → Environment Variables**:
```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 코드 수정: 서버 사이드에서 Service Role Key 사용
```typescript
// lib/services/groupService.ts
import { createClient } from '@supabase/supabase-js';

export class GroupService {
  private supabase;

  constructor() {
    // 서버 사이드에서는 Service Role Key 사용
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }
  
  // ... 나머지 코드
}
```

**장점**:
- RLS 정책을 우회하고 모든 데이터베이스 작업 가능
- 관리자 권한으로 안전하게 데이터 조작
- 서버 사이드에서만 사용되므로 보안 문제 없음

---

### Step 4: Supabase 테이블 스키마 확인

**Supabase Dashboard → Table Editor → groups**:
- `id` 컬럼: UUID, Primary Key, Default: `uuid_generate_v4()`
- `leader_session_id` 컬럼: VARCHAR, NOT NULL
- `tank_count`, `damage_count`, `support_count`: INTEGER, DEFAULT 0
- `total_members`: INTEGER, DEFAULT 0
- `status`: VARCHAR, DEFAULT 'waiting'
- `created_at`: TIMESTAMP, DEFAULT NOW()

---

## 🔧 Quick Fix: 즉시 배포 가능한 수정

### 파일: `.env.local` (로컬 개발용)
```env
NEXT_PUBLIC_SUPABASE_URL=https://zdnewnjvmthowbhpnkqc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY={Supabase Dashboard에서 복사}
```

### 파일: `lib/services/groupService.ts`
```typescript
constructor() {
  const isServer = typeof window === 'undefined';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  
  // 서버 사이드: Service Role Key 사용 (RLS 우회)
  // 클라이언트 사이드: Anon Key 사용 (보안)
  const supabaseKey = isServer && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  console.log('[GroupService] Supabase 초기화:', {
    isServer,
    keyType: isServer && process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon'
  });
  
  this.supabase = createClient(supabaseUrl, supabaseKey);
}
```

---

## 📊 Verification Steps

### 1. Vercel Logs 확인
```
https://vercel.com/dashboard → Deployments → Functions
```

### 2. Supabase RLS Status 확인
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('groups', 'group_members');
```

### 3. 수동 INSERT 테스트
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
  'test-session-123',
  1,
  0,
  0,
  1,
  'waiting'
);
```

성공하면 → RLS 정책 문제 아님
실패하면 → 스키마 문제 또는 RLS 정책 문제

---

## 🚀 Recommended Solution

### Option 1: Service Role Key 사용 (가장 안전하고 권장)
1. Supabase Dashboard → Settings → API → `service_role` key 복사
2. Vercel → Environment Variables → `SUPABASE_SERVICE_ROLE_KEY` 추가
3. 코드에서 서버 사이드 감지하여 적절한 키 사용
4. 재배포

### Option 2: RLS 정책 추가 (보안 강화)
1. Supabase → Authentication → Policies
2. 위의 SQL 정책 실행
3. 재배포 없이 즉시 적용

### Option 3: RLS 비활성화 (빠른 테스트용, 비권장)
1. SQL Editor에서 `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` 실행
2. 재배포 없이 즉시 적용
3. ⚠️ 프로덕션에서는 보안 위험 (모든 데이터 노출)

---

## 🎯 Next Steps

1. ✅ **Vercel Runtime Logs 확인** → 실제 에러 메시지 파악
2. ✅ **Supabase RLS 정책 확인** → 테이블별 정책 상태 확인
3. ✅ **Service Role Key 추가** → 가장 안정적인 솔루션
4. ✅ **재배포 및 테스트**

---

## 📞 Support Resources

- **Vercel Logs**: https://vercel.com/dashboard/deployments
- **Supabase Dashboard**: https://supabase.com/dashboard/project/zdnewnjvmthowbhpnkqc
- **Supabase Docs - RLS**: https://supabase.com/docs/guides/auth/row-level-security
- **GitHub Repo**: https://github.com/2022149025/find-group
