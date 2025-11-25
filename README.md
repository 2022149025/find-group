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
✅ Flex 포지션 지원 (모든 역할 가능, 자동 배정)
✅ 역할 검증 및 카운트 관리
✅ 실시간 그룹 대기실 UI
✅ 매칭 완료 화면 (친구추가 안내)
✅ 멤버 강제 퇴장 기능
✅ 자동 그룹 탈퇴 (브라우저 닫기/페이지 새로고침 시)
✅ 그룹장 권한 자동 인계 (그룹장 퇴장 시)
✅ 수동 그룹 나가기 버튼
✅ 1:1 문의 시스템 (버그 신고, 기능 요청, 개선 제안) 🆕
✅ 관리자 페이지 (비밀번호 인증, 문의 답변) 🆕
✅ 프로덕션 보안 강화 (XSS, SQL Injection, Rate Limiting) 🔐

## 현재 기능 엔트리 URI

### 프로필 & 매칭
- `POST /api/profile/create` - 임시 프로필 생성
  - Body: `{ nickname, battleTag, introduction?, mainPosition, currentTier, mainHeroes }`
- `POST /api/group/create` - 그룹 생성 (그룹장)
  - Body: `{ sessionId, position }` (position: 'Tank' | 'Damage' | 'Support' | 'Flex')
- `POST /api/group/join` - 그룹 참가 (자동 매칭)
  - Body: `{ sessionId, position }` (position: 'Tank' | 'Damage' | 'Support' | 'Flex')
- `GET /api/group/[groupId]` - 그룹 정보 조회
- `POST /api/group/check-complete` - 매칭 완료 강제 체크
  - Body: `{ groupId }`
- `GET /api/group/debug` - 디버그 정보 (대기 그룹, 통계)
- `POST /api/group/kick` - 멤버 강제 퇴장
  - Body: `{ groupId, leaderSessionId, targetSessionId }`
- `POST /api/group/leave` - 그룹 탈퇴
  - Body: `{ groupId, sessionId }`
  - Note: 그룹장이 나가면 다음 멤버에게 인계 (멤버 없으면 그룹 삭제)

### 1:1 문의 🆕
- `POST /api/inquiry/create` - 문의 접수
  - Body: `{ name, email, category, title, content }`
  - category: 'bug' | 'feature' | 'suggestion' | 'other'
- `GET /api/inquiry/list?email={email}` - 사용자별 문의 목록 조회
- `GET /api/inquiry/admin` - 관리자용 문의 목록 조회 🔐
  - Query: `?status=all|pending|answered`
- `POST /api/inquiry/reply` - 관리자용 답변 등록 🔐
  - Body: `{ inquiryId, adminReply }`

### 관리자 페이지 🔐
- `/admin/inquiries` - 문의 관리 페이지 (비밀번호 인증 필요)
  - 기본 비밀번호: `admin1234` (운영 환경에서 반드시 변경!)
  - 환경변수로 설정: `NEXT_PUBLIC_ADMIN_PASSWORD`
  - Vercel Dashboard → Settings → Environment Variables에서 설정

## 보안 기능 🔐

### 입력 검증
- ✅ XSS 방지 (HTML 태그 sanitization)
- ✅ SQL Injection 방지 (위험한 SQL 키워드 차단)
- ✅ 이메일 검증 (RFC 5322 형식)
- ✅ UUID 검증 (표준 UUID 형식)
- ✅ 길이 제한 (각 필드별 최소/최대 길이)

### Rate Limiting
- 프로필 생성: 5개/분
- 그룹 생성: 10개/분
- 문의 생성: 3개/분
- 문의 답변: 20개/분

### 에러 핸들링
- 프로덕션: 민감한 정보 숨김
- 개발: 상세한 디버그 정보
- 표준화된 에러 응답 형식
- API 요청/에러 로깅

**자세한 내용**: [SECURITY.md](./SECURITY.md) 참고

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
  - `inquiries`: 1:1 문의 (이름, 이메일, 카테고리, 제목, 내용, 답변) 🆕
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
- **상태**: ✅ **Production Ready** - 보안 강화 완료
- **기술 스택**: Next.js 16 + TypeScript + Tailwind CSS + Supabase
- **최신 커밋**: v2.0.0 - Security hardening for production
- **마지막 업데이트**: 2025-01-25

### 🚨 중요: Vercel 환경 변수 설정 필요
그룹 생성 기능이 작동하려면 **Vercel 환경 변수 추가가 필수**입니다:

1. **Supabase Dashboard** → Settings → API → `service_role` secret 복사
2. **Vercel Dashboard** → Settings → Environment Variables → 추가:
   - Key: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: {복사한 service_role key}
   - Environments: Production, Preview, Development 모두 체크
3. 저장 후 자동 재배포 대기 (1-2분)

**자세한 가이드**: `FIX_GROUP_CREATION_GUIDE.md` 참고

### 최근 업데이트 (v1.2.3)
- ✅ Supabase Service Role Key 지원 추가
- ✅ 서버/클라이언트 환경 자동 감지
- ✅ RLS (Row Level Security) 우회 기능
- ✅ 그룹 생성 실패 → 404 오류 근본 원인 수정
- ✅ 상세한 디버깅 로그 추가

📄 상세 분석: `CRITICAL_ERROR_ANALYSIS.md` 참고

## 로컬 개발 환경 설정

### 1. Supabase 프로젝트 생성
1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. 프로젝트 URL과 Anon Key 복사

### 2. 환경 변수 설정
`.env.local` 파일에 실제 Supabase 정보 입력:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_actual_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key  # 서버 사이드용 (선택사항)
```

**중요**: 
- `NEXT_PUBLIC_*`: 클라이언트/서버 모두 접근 가능
- `SUPABASE_SERVICE_ROLE_KEY`: 서버 전용 (RLS 우회), Supabase Dashboard → Settings → API에서 복사

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
