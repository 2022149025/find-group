# 🔧 그룹 생성 실패 해결 가이드

## 📋 문제 상황

**증상**: 그룹 생성 후 404 Not Found 오류 발생
- 그룹 생성 시도 → "그룹 매칭 실패" 메시지
- Debug API: `waitingGroups: 0`, `totalWaitingGroups: 0`
- GET 요청: `404 (Not Found)` - 그룹 ID를 찾을 수 없음

**원인**: Supabase 데이터베이스에 그룹 데이터가 전혀 저장되지 않음

---

## 🔍 Root Cause

### 문제: Supabase RLS (Row Level Security) 또는 권한 문제

현재 코드는 `NEXT_PUBLIC_SUPABASE_ANON_KEY` (익명 키)를 사용하고 있습니다. 이 키는 Supabase의 RLS 정책에 따라 제한됩니다:

1. **RLS 정책 미설정**: `groups` 및 `group_members` 테이블에 INSERT 권한이 없음
2. **익명 키 사용**: 클라이언트 전용 키로는 서버 사이드 작업에 제한이 있음
3. **Service Role Key 미사용**: 관리자 권한이 필요한 작업에는 Service Role Key가 필요

---

## ✅ 해결 방법 (2단계)

### Step 1: Supabase Service Role Key 확인

1. **Supabase Dashboard 이동**:
   https://supabase.com/dashboard/project/zdnewnjvmthowbhpnkqc

2. **Settings → API 클릭**

3. **Project API keys 섹션에서 `service_role` secret 복사**:
   ```
   ⚠️ 이 키는 절대 클라이언트에 노출하면 안 됩니다!
   서버 사이드(Vercel 환경 변수)에만 저장하세요.
   ```

---

### Step 2: Vercel 환경 변수 추가

#### 2-1. Vercel Dashboard 이동
https://vercel.com/dashboard

#### 2-2. 프로젝트 선택 → Settings → Environment Variables

#### 2-3. 새 환경 변수 추가:

| Key | Value | Environments |
|-----|-------|--------------|
| `SUPABASE_SERVICE_ROLE_KEY` | `{복사한 service_role key}` | ✅ Production<br>✅ Preview<br>✅ Development |

**중요**: 
- Variable Name: `SUPABASE_SERVICE_ROLE_KEY` (정확히 이 이름 사용)
- 모든 환경(Production, Preview, Development)에 체크
- Value는 Supabase Dashboard의 `service_role` secret 키

#### 2-4. 저장 후 자동 재배포 대기

Vercel은 환경 변수 추가 시 자동으로 재배포합니다. 약 1-2분 소요됩니다.

---

## 🧪 검증 방법

### 1. Vercel Runtime Logs 확인

**배포 후 로그 확인**:
1. Vercel Dashboard → Deployments → 최신 배포 클릭
2. Functions 탭 → `/api/group/create` 로그 확인

**정상 로그**:
```
[GroupService] Supabase 초기화: {
  isServer: true,
  keyType: 'service_role',    ← 이게 보여야 함!
  hasServiceKey: true
}

[GroupService] 그룹 생성 시작: {...}
[GroupService] 그룹 생성 성공: {...}
```

**오류 로그** (Service Key 없는 경우):
```
[GroupService] Supabase 초기화: {
  isServer: true,
  keyType: 'anon',            ← anon이면 문제!
  hasServiceKey: false
}
```

---

### 2. 실제 그룹 생성 테스트

#### 테스트 시나리오:
1. 앱 접속: https://find-group.vercel.app
2. **Start quick group matching** 버튼 클릭
3. 닉네임 입력 (예: "테스터123")
4. 역할 선택 (예: Support)
5. **"그룹장으로 시작하기"** 클릭

#### 예상 결과:
- ✅ "대기 중인 그룹원들..." 화면으로 전환
- ✅ 우측 상단에 그룹 ID 표시
- ✅ 역할 통계: Support 1/2 표시
- ✅ 브라우저 개발자 도구 콘솔: `[GroupLobby] Fetch group data: {...}` 로그

#### 실패 시:
- ❌ "그룹 매칭 실패" 메시지
- ❌ Debug info: `waitingGroups: 0`

---

### 3. Debug API로 데이터 확인

```bash
curl https://find-group.vercel.app/api/group/debug
```

**정상 응답** (그룹 생성 후):
```json
{
  "success": true,
  "data": {
    "rawQuery": {
      "count": 1,                    ← 1 이상이어야 함!
      "groups": [
        {
          "id": "uuid...",
          "status": "waiting",
          "tank_count": 0,
          "damage_count": 0,
          "support_count": 1,
          "total_members": 1,
          "created_at": "2025-11-23T..."
        }
      ]
    },
    "stats": {
      "totalWaitingGroups": 1,       ← 1 이상!
      "tankNeeded": 1,
      "damageNeeded": 2,
      "supportNeeded": 1
    }
  }
}
```

---

## 🚨 Troubleshooting

### 문제 1: "Service Role Key를 찾을 수 없습니다"

**확인 사항**:
1. Vercel 환경 변수 이름: `SUPABASE_SERVICE_ROLE_KEY` (정확히)
2. 모든 환경(Production, Preview, Development)에 체크했는지
3. 재배포 완료 후 테스트했는지

**해결책**:
```bash
# Vercel CLI로 환경 변수 확인
vercel env ls
```

---

### 문제 2: "여전히 그룹이 생성되지 않습니다"

**추가 확인 사항**:
1. Supabase 프로젝트가 활성화되어 있는지
2. API 키가 올바른지 (복사 시 공백 없는지)
3. Vercel Functions 로그에서 실제 에러 메시지 확인

**임시 해결책 (RLS 비활성화)**:
```sql
-- Supabase SQL Editor에서 실행 (테스트용)
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE temporary_profiles DISABLE ROW LEVEL SECURITY;
```

⚠️ 주의: 프로덕션에서는 RLS 정책을 제대로 설정하는 것이 안전합니다.

---

### 문제 3: "RLS 정책 설정이 필요합니다"

**정식 RLS 정책 설정**:
```sql
-- Supabase SQL Editor에서 실행

-- groups 테이블
CREATE POLICY "Anyone can insert groups"
ON groups FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can view groups"
ON groups FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can update groups"
ON groups FOR UPDATE
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can delete groups"
ON groups FOR DELETE
TO anon, authenticated
USING (true);

-- group_members 테이블
CREATE POLICY "Anyone can insert members"
ON group_members FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can view members"
ON group_members FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can update members"
ON group_members FOR UPDATE
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can delete members"
ON group_members FOR DELETE
TO anon, authenticated
USING (true);

-- temporary_profiles 테이블
CREATE POLICY "Anyone can insert profiles"
ON temporary_profiles FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can view profiles"
ON temporary_profiles FOR SELECT
TO anon, authenticated
USING (true);
```

---

## 📊 코드 변경 사항

### 변경된 파일: `lib/services/groupService.ts`

**이전 코드**:
```typescript
constructor() {
  this.supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**수정된 코드**:
```typescript
constructor() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  
  // 서버 사이드: Service Role Key 사용 (RLS 우회)
  // 클라이언트 사이드: Anon Key 사용 (보안)
  const isServer = typeof window === 'undefined';
  const supabaseKey = isServer && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  console.log('[GroupService] Supabase 초기화:', {
    isServer,
    keyType: isServer && process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon',
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  });
  
  this.supabase = createClient(supabaseUrl, supabaseKey);
}
```

**변경 내용**:
- 서버 사이드 감지 (`typeof window === 'undefined'`)
- 서버에서는 Service Role Key 우선 사용
- 클라이언트에서는 Anon Key 사용 (보안 유지)
- 초기화 로그로 어떤 키를 사용하는지 확인 가능

---

## ✅ 체크리스트

배포 전:
- [ ] Supabase Dashboard에서 Service Role Key 복사
- [ ] Vercel 환경 변수 `SUPABASE_SERVICE_ROLE_KEY` 추가
- [ ] 모든 환경(Production, Preview, Development)에 체크
- [ ] 저장 후 자동 재배포 대기 (1-2분)

배포 후:
- [ ] Vercel Runtime Logs에서 `keyType: 'service_role'` 확인
- [ ] 실제 그룹 생성 테스트 (그룹장으로 시작)
- [ ] Debug API에서 `count: 1`, `totalWaitingGroups: 1` 확인
- [ ] 다른 브라우저에서 그룹원으로 참가 테스트

---

## 🎯 Expected Outcome

이 수정 후:
1. ✅ 그룹 생성 시 데이터베이스에 즉시 저장
2. ✅ 다른 사용자가 해당 그룹을 조회하고 참가 가능
3. ✅ Debug API에서 대기 중인 그룹 확인 가능
4. ✅ 404 Not Found 오류 해결

---

## 📞 Support

- **Supabase Dashboard**: https://supabase.com/dashboard/project/zdnewnjvmthowbhpnkqc
- **Vercel Dashboard**: https://vercel.com/dashboard
- **GitHub Repo**: https://github.com/2022149025/find-group
- **앱 URL**: https://find-group.vercel.app

문제가 계속되면 Vercel Functions 로그에서 실제 에러 메시지를 확인해주세요!
