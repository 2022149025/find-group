# 🔐 Vercel 환경 변수 설정 가이드 (방법 2)

## 📋 Step-by-Step Guide

### Step 1: Supabase Service Role Key 복사

#### 1-1. Supabase Dashboard 접속
https://supabase.com/dashboard/project/zdnewnjvmthowbhpnkqc

#### 1-2. Settings → API 이동
- 왼쪽 사이드바에서 **⚙️ Settings** 클릭
- **API** 탭 클릭

#### 1-3. Service Role Key 복사
**Project API keys** 섹션에서:
- `service_role` 라벨이 있는 키 찾기
- **secret** 옆의 👁️ 아이콘 클릭하여 키 표시
- 전체 키 복사 (매우 긴 문자열, 약 200+ 글자)

**예시**:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp...
```

⚠️ **주의**: 이 키는 **절대 클라이언트 코드나 GitHub에 노출하면 안 됩니다!** 
서버 사이드(Vercel 환경 변수)에만 저장하세요.

---

### Step 2: Vercel 환경 변수 추가

#### 2-1. Vercel Dashboard 접속
https://vercel.com/dashboard

#### 2-2. 프로젝트 선택
- **find-group** 프로젝트 클릭

#### 2-3. Settings → Environment Variables 이동
- 상단 탭에서 **Settings** 클릭
- 왼쪽 사이드바에서 **Environment Variables** 클릭

#### 2-4. 새 환경 변수 추가
**Add New** 버튼 클릭 후:

| 필드 | 값 |
|------|-----|
| **Name** | `SUPABASE_SERVICE_ROLE_KEY` |
| **Value** | `{Step 1에서 복사한 service_role key}` |
| **Environments** | ✅ **Production**<br>✅ **Preview**<br>✅ **Development** |

**중요**:
- Name은 정확히 `SUPABASE_SERVICE_ROLE_KEY` (대소문자 구분)
- 세 가지 환경 모두 체크
- Value는 복사한 전체 키 (공백 없이)

#### 2-5. Save 버튼 클릭

---

### Step 3: 자동 재배포 대기

#### 3-1. Vercel 자동 재배포 시작
- 환경 변수 저장 시 Vercel이 자동으로 재배포 시작
- "Building..." 상태 표시

#### 3-2. 배포 완료 대기 (약 1-2분)
**확인 방법**:
1. Vercel Dashboard → **Deployments** 탭
2. 최신 배포 상태 확인:
   - 🟡 Building → 🔄 진행 중
   - 🟢 Ready → ✅ 완료

---

### Step 4: 환경 변수 확인

#### 4-1. Env Check API 호출
```bash
curl https://find-group.vercel.app/api/env-check | jq '.'
```

#### 4-2. 정상 응답 확인
```json
{
  "success": true,
  "data": {
    "server": {
      "isServer": true,
      "hasServiceRoleKey": true,              // ✅ true여야 함!
      "serviceRoleKeyLength": 200,            // ✅ 200+ 값
      "serviceRoleKeyPreview": "eyJhbGciOi..."// ✅ 키 프리뷰 표시
    },
    "public": {
      "hasSupabaseUrl": true,
      "hasAnonKey": true
    },
    "recommendation": {
      "canUseServiceRole": true,              // ✅ true!
      "shouldAddServiceRole": false,          // ✅ false!
      "message": "✅ Service Role Key가 설정되어 있습니다. RLS를 우회할 수 있습니다."
    }
  }
}
```

**문제 발생 시** (hasServiceRoleKey: false):
1. Vercel 배포가 완료되었는지 재확인
2. 환경 변수 이름 확인: `SUPABASE_SERVICE_ROLE_KEY` (정확)
3. 세 가지 환경 모두 체크했는지 확인
4. 1-2분 더 대기 후 다시 확인

---

### Step 5: 그룹 생성 테스트

#### 5-1. 앱 접속
https://find-group.vercel.app

#### 5-2. 프로필 생성
1. **Start quick group matching** 버튼 클릭
2. 닉네임 입력 (예: "테스터123")
3. 배틀태그 입력 (예: "Tester#1234")
4. 포지션 선택 (예: Support)
5. 티어 선택 (예: Gold)
6. 영웅 선택 (예: Moira, Ana)
7. **확인** 버튼 클릭

#### 5-3. 그룹 생성
1. **"그룹장으로 시작하기"** 버튼 클릭

#### 5-4. 예상 결과
**성공 시**:
- ✅ "대기 중인 그룹원들..." 화면으로 전환
- ✅ 우측 상단에 그룹 ID 표시
- ✅ 역할 통계: Support 1/2 표시
- ✅ 2초마다 자동 폴링
- ✅ 브라우저 콘솔: `[GroupLobby] Fetch group data` 로그

**실패 시**:
- ❌ "그룹 매칭 실패" 메시지
- ❌ 404 오류
- → Vercel Functions 로그 확인 필요

---

### Step 6: Debug API로 검증

#### 6-1. Debug API 호출
```bash
curl https://find-group.vercel.app/api/group/debug | jq '.'
```

#### 6-2. 정상 응답 (그룹 생성 후)
```json
{
  "success": true,
  "data": {
    "environment": {
      "hasKey": true
    },
    "rawQuery": {
      "count": 1,                    // ✅ 1 이상!
      "groups": [
        {
          "id": "uuid...",
          "leader_session_id": "...",
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
      "totalWaitingGroups": 1,       // ✅ 1 이상!
      "tankNeeded": 1,
      "damageNeeded": 2,
      "supportNeeded": 1
    }
  }
}
```

---

### Step 7: Vercel Functions 로그 확인 (선택사항)

#### 7-1. Vercel Dashboard 접속
https://vercel.com/dashboard

#### 7-2. 최신 배포 클릭
- **Deployments** 탭
- 최신 배포 (Ready 상태) 클릭

#### 7-3. Functions 탭 이동
- **Functions** 탭 클릭
- `/api/group/create` 함수 찾기

#### 7-4. 로그 확인
**정상 로그** (Service Role Key 사용 중):
```
[GroupService] Supabase 초기화: {
  isServer: true,
  url: 'https://zdnewnjvmthowbhpnkqc.s...',
  keyType: 'service_role',           // ✅ 'service_role'!
  hasServiceKey: true                // ✅ true!
}

[GroupService] 그룹 생성 시작: {
  leaderSessionId: '...',
  leaderPosition: 'Support'
}

[GroupService] 그룹 생성 성공: {
  id: 'uuid...',
  status: 'waiting',
  position: 'Support'
}

[GroupService] 그룹장 멤버 추가 성공
```

**오류 로그** (Service Key 미설정):
```
[GroupService] Supabase 초기화: {
  keyType: 'anon',                   // ❌ 'anon'이면 문제!
  hasServiceKey: false               // ❌ false면 문제!
}

[GroupService] 그룹 생성 실패: {
  message: 'new row violates row-level security policy'
}
```

---

## 🔍 트러블슈팅

### 문제 1: hasServiceRoleKey가 여전히 false

**원인**:
- 환경 변수 이름 오타
- 환경 체크박스 누락
- 재배포 미완료

**해결책**:
1. Vercel → Settings → Environment Variables 재확인
2. Variable Name: `SUPABASE_SERVICE_ROLE_KEY` (정확히)
3. Production, Preview, Development 모두 체크
4. 저장 후 2-3분 대기
5. `curl https://find-group.vercel.app/api/env-check` 재확인

---

### 문제 2: 그룹이 여전히 생성되지 않음

**확인 사항**:
1. **Env Check API**: `hasServiceRoleKey: true` 확인
2. **Vercel Functions 로그**: 실제 에러 메시지 확인
3. **Supabase Dashboard**: 프로젝트가 활성화되어 있는지 확인

**추가 해결책**:
- Supabase API 키가 유효한지 확인
- Supabase 프로젝트가 일시중지되지 않았는지 확인
- Vercel Functions 로그에서 구체적인 에러 메시지 확인

---

### 문제 3: Service Role Key를 찾을 수 없음

**Supabase Dashboard에서**:
1. Settings → API
2. **Project API keys** 섹션
3. `service_role` 라벨 찾기 (anon이 아님!)
4. 키 옆의 👁️ 아이콘으로 표시
5. 전체 키 복사

**주의**: `anon` 키가 아닌 `service_role` 키를 사용해야 합니다!

---

## ✅ 최종 체크리스트

### Supabase (Step 1)
- [ ] Supabase Dashboard 접속
- [ ] Settings → API 이동
- [ ] `service_role` secret 키 복사 (약 200+ 글자)

### Vercel (Step 2-3)
- [ ] Vercel Dashboard 접속
- [ ] find-group 프로젝트 선택
- [ ] Settings → Environment Variables
- [ ] 환경 변수 추가:
  - Name: `SUPABASE_SERVICE_ROLE_KEY`
  - Value: {복사한 키}
  - Environments: Production, Preview, Development 모두 체크
- [ ] Save 버튼 클릭
- [ ] 재배포 완료 대기 (1-2분)

### 검증 (Step 4-6)
- [ ] Env Check API: `hasServiceRoleKey: true` 확인
- [ ] 앱에서 프로필 생성 → 그룹 생성 테스트
- [ ] "대기 중인 그룹원들..." 화면 표시 확인
- [ ] Debug API: `count: 1`, `totalWaitingGroups: 1` 확인

### Functions 로그 확인 (Step 7, 선택)
- [ ] Vercel Deployments → Functions 탭
- [ ] `/api/group/create` 로그에서 `keyType: 'service_role'` 확인

---

## 📊 Before & After 비교

### Before (환경 변수 없음)
```json
// Env Check API
{
  "server": {
    "hasServiceRoleKey": false,      // ❌
    "serviceRoleKeyPreview": "NOT SET"
  },
  "recommendation": {
    "message": "⚠️ Service Role Key가 없습니다..."
  }
}

// Debug API
{
  "rawQuery": {
    "count": 0,                      // ❌
    "groups": []
  }
}
```

### After (환경 변수 설정 완료)
```json
// Env Check API
{
  "server": {
    "hasServiceRoleKey": true,       // ✅
    "serviceRoleKeyLength": 208,
    "serviceRoleKeyPreview": "eyJhbGciOi..."
  },
  "recommendation": {
    "message": "✅ Service Role Key가 설정되어 있습니다."
  }
}

// Debug API
{
  "rawQuery": {
    "count": 1,                      // ✅
    "groups": [{...}]
  },
  "stats": {
    "totalWaitingGroups": 1          // ✅
  }
}
```

---

## 📞 Support Links

- **Supabase Dashboard**: https://supabase.com/dashboard/project/zdnewnjvmthowbhpnkqc
- **Supabase API Settings**: https://supabase.com/dashboard/project/zdnewnjvmthowbhpnkqc/settings/api
- **Vercel Dashboard**: https://vercel.com/dashboard
- **앱 URL**: https://find-group.vercel.app
- **Env Check API**: https://find-group.vercel.app/api/env-check
- **Debug API**: https://find-group.vercel.app/api/group/debug

---

## 🎯 다음 단계

설정 완료 후:
1. ✅ 다른 브라우저에서 그룹원으로 참가 테스트
2. ✅ 역할별 매칭 테스트 (Tank, Damage, Support)
3. ✅ 1T-2D-2H 매칭 완료 테스트
4. ✅ 멤버 강제 퇴장 기능 테스트
5. ✅ 자동 그룹 탈퇴 기능 테스트 (브라우저 닫기)

---

**📌 이 가이드대로 설정하면 그룹 생성 문제가 해결됩니다!** 🎉
