# 🔍 앱 플로우 디버깅 가이드

## 현재 문제

- **증상**: 그룹장으로 시작 → 대기실 화면 표시 → 404 오류
- **Supabase**: 그룹 ID가 존재하지 않음
- **예상**: API가 성공 응답을 보냈지만 실제로 DB에 저장되지 않음

---

## 🔍 브라우저에서 확인해야 할 것

### 1. Network 탭 확인

**F12 → Network 탭 열기**

#### Step 1: 프로필 생성 요청 확인
- **요청**: `POST /api/profile/create`
- **Status**: 200 (성공)?
- **Response Body**: `sessionId` 확인 (예: `session_1763975...`)

#### Step 2: 그룹 생성 요청 확인 ⭐ 중요!
- **요청**: `POST /api/group/create`
- **Status**: 200 (성공)? 또는 400/500 (실패)?
- **Request Payload**:
  ```json
  {
    "sessionId": "session_...",
    "position": "Tank"
  }
  ```
- **Response Body**:
  ```json
  {
    "success": true,
    "data": {
      "id": "2d90b4b9-...",
      ...
    }
  }
  ```
  또는 에러?

#### Step 3: 그룹 조회 요청 확인
- **요청**: `GET /api/group/2d90b4b9-...`
- **Status**: 404 (Not Found)
- **Response Body**:
  ```json
  {
    "success": false,
    "error": "Group not found"
  }
  ```

---

### 2. Console 로그 확인

**F12 → Console 탭**

찾아야 할 로그:
```
[GroupService] Supabase 초기화: {isServer: true, keyType: '...', ...}
[GroupService] 그룹 생성 시작: {...}
[GroupService] 그룹 생성 성공: {...}
[GroupService] 그룹장 멤버 추가 성공
```

또는 에러:
```
[GroupService] 그룹 생성 실패: ...
[GroupService] 멤버 추가 실패: ...
```

---

## 🧪 수동 테스트

### Test 1: 프로필 생성
```bash
curl -X POST https://find-group.vercel.app/api/profile/create \
  -H "Content-Type: application/json" \
  -d '{
    "nickname": "AppTest",
    "battleTag": "AppTest#1234",
    "mainPosition": "Tank",
    "currentTier": {"rank": "Gold", "division": 3},
    "mainHeroes": ["Reinhardt", "Winston"]
  }'
```

**복사할 것**: `sessionId` (예: `session_1763975...`)

---

### Test 2: 그룹 생성
```bash
curl -X POST https://find-group.vercel.app/api/group/create \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "{위에서 복사한 sessionId}",
    "position": "Tank"
  }'
```

**복사할 것**: `id` (그룹 ID)

---

### Test 3: 그룹 조회
```bash
curl https://find-group.vercel.app/api/group/{위에서 복사한 그룹 ID}
```

**예상 결과**:
- ✅ 성공: `success: true`, 그룹 및 멤버 데이터
- ❌ 실패: `success: false`, `error: "Group not found"`

---

### Test 4: Supabase에서 확인
```sql
-- sessionId로 프로필 확인
SELECT * FROM temporary_profiles 
WHERE session_id = '{복사한 sessionId}';

-- 그룹 ID로 그룹 확인
SELECT * FROM groups 
WHERE id = '{복사한 그룹 ID}';

-- 그룹 멤버 확인
SELECT * FROM group_members 
WHERE group_id = '{복사한 그룹 ID}';
```

---

## 🔍 가능한 원인

### 원인 1: Transaction Rollback
- 그룹 생성은 성공했지만
- 멤버 추가가 실패하면서
- 전체 트랜잭션이 롤백

**확인 방법**: Vercel Functions 로그

---

### 원인 2: Service Role Key 문제
- 환경 변수가 다시 사라졌거나
- 재배포 시 환경 변수가 적용되지 않음

**확인 방법**:
```bash
curl https://find-group.vercel.app/api/env-check
```

예상: `hasServiceRoleKey: true`

---

### 원인 3: Foreign Key 제약 다시 활성화
- 데이터 삭제 시 제약 조건도 함께 제거되었거나
- NOT VALID 옵션이 사라짐

**확인 방법**: Supabase SQL
```sql
SELECT constraint_name, table_name 
FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY' 
AND table_name IN ('groups', 'group_members');
```

---

### 원인 4: RLS 다시 활성화
- 데이터 삭제 시 RLS도 다시 켜짐

**확인 방법**: Supabase SQL
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('groups', 'group_members', 'temporary_profiles');
```

예상: 모두 `false`

---

## ✅ 즉시 실행해야 할 것

1. **Vercel Functions 로그 확인**:
   - Vercel Dashboard → Deployments → 최신 배포 → Functions
   - `/api/group/create` 함수 로그 확인
   - 실제 에러 메시지 찾기

2. **환경 변수 확인**:
   ```bash
   curl https://find-group.vercel.app/api/env-check
   ```

3. **앱에서 다시 테스트하면서 Network 탭 캡처**:
   - `/api/profile/create` Response
   - `/api/group/create` Response (⭐ 가장 중요!)
   - `/api/group/{id}` Response

---

**다음 정보를 알려주세요**:
1. Network 탭에서 `/api/group/create`의 **Status Code**는?
2. `/api/group/create`의 **Response Body** 전체 내용은?
3. Console 탭에 어떤 로그가 나타나나요?
