# 오버워치 5인 역할 고정 그룹 매칭 서비스

## 프로젝트 개요
- **이름**: 오버워치 그룹 매칭
- **목표**: 오버워치 플레이어가 1 Tank - 2 Damage - 2 Support 역할 고정 5인 그룹을 회원가입 없이 신속하게 구성
- **주요 기능**:
  - 비회원 임시 프로필 생성 (30분 자동 만료)
  - 그룹장/그룹원 모드 선택
  - 자동 그룹 매칭
  - 실시간 그룹 현황 표시 (5초 폴링)
  - 그룹장의 멤버 강제 퇴장 기능
  - 1T-2D-2H 매칭 완료 감지

## 완성된 기능
✅ 임시 프로필 생성 (닉네임, 배틀태그, 포지션, 티어, 영웅)
✅ 그룹장으로 시작 (새 그룹 생성)
✅ 그룹원으로 시작 (자동 매칭)
✅ 역할 검증 및 카운트 관리
✅ 실시간 그룹 대기실 UI
✅ 매칭 완료 화면
✅ 멤버 강제 퇴장 기능
✅ 자동 그룹 탈퇴 (브라우저 닫기/페이지 새로고침 시) 🆕

## 현재 기능 엔트리 URI
- `POST /api/profile/create` - 임시 프로필 생성
  - Body: `{ nickname, battleTag, introduction?, mainPosition, currentTier, mainHeroes }`
- `POST /api/group/create` - 그룹 생성 (그룹장)
  - Body: `{ sessionId, position }`
- `POST /api/group/join` - 그룹 참가 (자동 매칭)
  - Body: `{ sessionId, position }`
- `GET /api/group/[groupId]` - 그룹 정보 조회
- `POST /api/group/kick` - 멤버 강제 퇴장
  - Body: `{ groupId, leaderSessionId, targetSessionId }`
- `POST /api/group/leave` - 그룹 탈퇴 🆕
  - Body: `{ groupId, sessionId }`
  - Note: 그룹장이 나가면 다음 멤버에게 인계 (멤버 없으면 그룹 삭제)

## 미구현 기능
- WebSocket 실시간 알림 (현재는 5초 폴링 방식 사용)
- 세션 자동 만료 크론잡
- 디스코드 초대 링크 생성
- 매칭 통계 대시보드

## 권장 다음 단계
1. Supabase Realtime 구독으로 실시간 업데이트 개선
2. Vercel Cron Jobs로 만료된 세션 자동 정리
3. 디스코드 봇 연동으로 초대 링크 생성
4. 매칭 통계 페이지 추가

## 데이터 아키텍처
- **데이터 모델**:
  - `temporary_profiles`: 임시 사용자 프로필 (30분 만료)
  - `groups`: 그룹 정보 (리더, 역할 카운트, 상태)
  - `group_members`: 그룹 멤버 정보 (세션 ID, 포지션, 리더 여부)
- **스토리지 서비스**: Supabase PostgreSQL
- **데이터 플로우**:
  1. 클라이언트 → API Route → Business Logic → Supabase
  2. Supabase → Business Logic → API Route → 클라이언트

## 사용자 가이드
1. **시작하기 버튼** 클릭
2. **My Informations** 입력 (닉네임, 배틀태그, 포지션, 티어, 영웅)
3. **모드 선택**:
   - **그룹장으로 시작**: 새 그룹 생성 및 멤버 대기
   - **그룹원으로 시작**: 자동으로 기존 그룹에 참가
4. **그룹 대기실**에서 멤버 확인
5. **매칭 완료** 시 팀 정보 확인

## URLs
- **GitHub 리포지토리**: https://github.com/2022149025/find-group
- **Vercel 배포**: 배포 진행 중 (VERCEL_DEPLOYMENT.md 참고)
- **개발 서버**: https://3000-izvyyqjt7wc6iz8mdpo07-b32ec7bb.sandbox.novita.ai

## 배포 정보
- **플랫폼**: Vercel (Next.js)
- **데이터베이스**: Supabase (연결 완료)
- **상태**: ✅ 코드 완성, 배포 준비 완료
- **기술 스택**: Next.js 16 + TypeScript + Tailwind CSS + Supabase
- **마지막 업데이트**: 2025-11-23

## 로컬 개발 환경 설정

### 1. Supabase 프로젝트 생성
1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. 프로젝트 URL과 Anon Key 복사

### 2. 환경 변수 설정
`.env.local` 파일에 실제 Supabase 정보 입력:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_actual_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_supabase_anon_key
```

### 3. 데이터베이스 마이그레이션
Supabase SQL Editor에서 `supabase/migrations/001_initial_schema.sql` 실행

### 4. 의존성 설치 및 개발 서버 실행
```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

## 프로젝트 구조
```
webapp/
├── app/
│   ├── api/                    # API Routes
│   │   ├── profile/create/     # 프로필 생성
│   │   └── group/              # 그룹 관련 API
│   └── page.tsx                # 메인 페이지
├── components/                 # React 컴포넌트
│   ├── profile/                # 프로필 폼
│   ├── mode/                   # 모드 선택
│   ├── group/                  # 그룹 대기실
│   └── matching/               # 매칭 완료
├── lib/                        # Business Logic
│   ├── services/               # 서비스 레이어
│   └── session/                # 세션 관리
└── supabase/
    └── migrations/             # 데이터베이스 스키마
```

## 라이센스
MIT
