# 🔍 그룹 조회 문제 디버깅 가이드

## 문제 상황
**증상**: 다른 그룹이 이미 존재하는데도 "현재 대기 중인 그룹이 없습니다" 에러 발생

## 가능한 원인

### 1. 환경변수 문제 (가장 흔함)
- Vercel에서 `NEXT_PUBLIC_SUPABASE_URL` 또는 `NEXT_PUBLIC_SUPABASE_ANON_KEY`가 설정되지 않음
- 환경변수가 Production/Preview/Development 모두에 적용되지 않음
- 환경변수 변경 후 재배포하지 않음

### 2. Supabase 연결 문제
- Supabase 프로젝트가 일시 중지됨 (무료 플랜 7일 비활성)
- RLS (Row Level Security) 정책 문제
- 네트워크 문제

### 3. 데이터베이스 상태 문제
- `groups` 테이블이 생성되지 않음
- 그룹이 생성되었지만 `status`가 'waiting'이 아님
- 그룹이 생성되었지만 즉시 삭제됨

## 진단 단계

### Step 1: Debug API로 상세 정보 확인

배포된 앱에서 다음 URL에 접속:
```
https://your-app.vercel.app/api/group/debug
```

**예상 응답**:
```json
{
  "success": true,
  "data": {
    "environment": {
      "NEXT_PUBLIC_SUPABASE_URL": "https://zdnewnjvmthowbhpnkqc...",
      "hasKey": true
    },
    "rawQuery": {
      "count": 1,
      "groups": [
        {
          "id": "abc123...",
          "status": "waiting",
          "tanks": 1,
          "damage": 0,
          "support": 0,
          "total": 1
        }
      ],
      "error": null
    },
    "serviceQuery": {
      "count": 1,
      "groups": [...]
    },
    "stats": {
      "totalWaitingGroups": 1,
      "tankNeeded": 0,
      "damageNeeded": 1,
      "supportNeeded": 1
    }
  }
}
```

#### 문제별 대응

**Case 1: `hasKey: false` 또는 환경변수 없음**
```json
{
  "success": false,
  "error": "Supabase 환경변수가 설정되지 않았습니다",
  "debug": {
    "NEXT_PUBLIC_SUPABASE_URL": false,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": false
  }
}
```

**해결책**:
1. Vercel Dashboard > 프로젝트 선택 > Settings > Environment Variables
2. 다음 변수 추가:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://zdnewnjvmthowbhpnkqc.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. **적용 범위**: Production, Preview, Development 모두 체크 ✅
4. Vercel에서 자동 재배포 대기 또는 수동 재배포

**Case 2: `rawQuery.count: 0` (그룹이 실제로 없음)**
```json
{
  "rawQuery": {
    "count": 0,
    "groups": [],
    "error": null
  }
}
```

**원인**: 
- 그룹장이 그룹을 생성하지 않음
- 그룹이 생성되었지만 이미 삭제됨
- 그룹 상태가 'matched'로 변경됨

**해결책**:
1. 새로 그룹장으로 그룹 생성
2. 또는 실제 그룹장이 있는지 확인

**Case 3: `rawQuery.error` 있음 (Supabase 오류)**
```json
{
  "rawQuery": {
    "count": 0,
    "groups": [],
    "error": "relation \"public.groups\" does not exist"
  }
}
```

**원인**: 
- `groups` 테이블이 생성되지 않음

**해결책**:
1. Supabase Dashboard > SQL Editor
2. `/supabase/migrations/002_fix_schema.sql` 실행
3. Table Editor에서 `groups`, `group_members`, `temporary_profiles` 확인

**Case 4: `rawQuery.count > 0`이지만 `serviceQuery.count = 0`**
```json
{
  "rawQuery": { "count": 1, ... },
  "serviceQuery": { "count": 0, ... }
}
```

**원인**: 
- 서비스 레이어의 데이터 변환 문제
- `mapGroupData` 함수 오류

**해결책**:
- 서버 로그 확인 필요
- GitHub Issue 생성

### Step 2: Vercel 로그 확인

1. Vercel Dashboard > Deployments > 최신 배포 선택
2. Functions 탭 클릭
3. 로그에서 다음 검색:

```
[GroupService] getWaitingGroups 시작
[GroupService] Supabase URL: https://...
[GroupService] 조회된 그룹 수: X
```

**정상 로그 예시**:
```
[GroupService] getWaitingGroups 시작
[GroupService] Supabase URL: https://zdnewnjvmthowbhpnkqc...
[GroupService] 조회된 그룹 수: 1
[GroupService] 그룹 상세: [{ id: 'abc123...', status: 'waiting', ... }]
```

**비정상 로그 예시**:
```
[GroupService] getWaitingGroups 시작
[GroupService] Supabase URL: undefined...
[GroupService] 쿼리 오류: { message: "Invalid API key" }
```

### Step 3: Supabase 테이블 직접 확인

1. Supabase Dashboard > Table Editor
2. `groups` 테이블 선택
3. 필터: `status = 'waiting'`

**확인 사항**:
- 실제로 대기 중인 그룹이 있는가?
- `status` 컬럼이 정확히 'waiting'인가?
- `tank_count`, `damage_count`, `support_count` 값이 올바른가?

### Step 4: 브라우저 개발자 도구 확인

1. F12 > Console 탭
2. "그룹원으로 시작" 클릭
3. 로그 확인:

```javascript
[MatchingService] 대기 중인 그룹 수: 0
[MatchingService] 찾는 포지션: Tank
[API /api/group/join] 매칭 통계: { totalWaitingGroups: 0, ... }
[그룹 매칭 실패] 디버그 정보: { waitingGroups: 0, ... }
```

## 즉시 해결 방법

### 방법 1: 환경변수 재설정 (가장 효과적)

```bash
# Vercel Dashboard에서:
1. Settings > Environment Variables
2. 기존 변수 삭제
3. 새로 추가:
   NEXT_PUBLIC_SUPABASE_URL=https://zdnewnjvmthowbhpnkqc.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkbmV3bmp2bXRob3diaHBua3FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MjMzMjAsImV4cCI6MjA3OTQ5OTMyMH0.j5Jw_dhTEh7jkJob4Vv0VwpEpN0ti4zTcZAj0PpA75I
4. Production, Preview, Development 모두 체크
5. Save
6. 재배포 대기 (자동) 또는 수동 재배포
```

### 방법 2: Supabase 프로젝트 확인

```bash
1. Supabase Dashboard 접속
2. 프로젝트 상태 확인 (Paused인 경우 Resume)
3. Settings > API
4. URL과 anon key가 Vercel 환경변수와 일치하는지 확인
```

### 방법 3: 테이블 재생성

```sql
-- Supabase SQL Editor에서 실행
-- 1. 기존 테이블 삭제 (데이터 주의!)
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS temporary_profiles CASCADE;

-- 2. 마이그레이션 재실행
-- /supabase/migrations/002_fix_schema.sql 전체 복사 후 실행
```

## 테스트 체크리스트

배포 완료 후 다음 순서로 테스트:

- [ ] Debug API 접속: `/api/group/debug`
  - [ ] `environment.hasKey: true` 확인
  - [ ] Supabase URL이 올바른지 확인

- [ ] 그룹장 생성 테스트
  - [ ] 프로필 생성
  - [ ] "그룹장으로 시작" 클릭
  - [ ] 그룹 대기실 진입 확인
  - [ ] Debug API에서 `rawQuery.count: 1` 확인

- [ ] 그룹원 참가 테스트
  - [ ] 새 브라우저/시크릿 모드
  - [ ] 다른 포지션으로 프로필 생성
  - [ ] "그룹원으로 시작" 클릭
  - [ ] 자동 참가 성공 확인

## 커밋 정보
- Commit: 26cbb87
- Message: "Debug: Add comprehensive logging for group query issues"
- Files changed: 2

## 다음 단계

문제가 지속되면:

1. **Debug API 결과를 캡처**하여 공유
2. **Vercel 로그**를 확인하여 오류 메시지 공유
3. **Supabase Table Editor**에서 실제 데이터 확인

이 정보를 바탕으로 정확한 원인을 파악할 수 있습니다.
