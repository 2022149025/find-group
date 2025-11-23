# Changelog

## [1.2.1] - 2025-11-23

### Fixed
- 🐛 **그룹장 화면 실시간 업데이트 개선**
  - 폴링 간격 5초 → 2초 단축 (60% 개선)
  - 캐시 방지 헤더 추가 (`Cache-Control: no-cache`)
  - 새 멤버 참가 감지 로깅 추가
  - 매칭 완료 후 폴링 자동 중지

### Changed
- ⚡ 실시간 업데이트 성능 개선
  - 최대 지연 시간: 5초 → 2초
  - 더 빠른 그룹원 참가 감지

### Technical Details
- `GroupLobby.tsx`: 폴링 로직 최적화
- HTTP 캐시 제어 헤더 추가
- 의존성 배열 개선

---

## [1.2.0] - 2025-11-23

### Added
- ✨ 그룹장 인계 기능
  - 그룹장이 나가면 가장 먼저 들어온 멤버에게 자동 인계
  - 멤버가 없으면 그룹 자동 삭제
  - 그룹장 변경 시 알림 메시지 표시
- 🔄 개선된 페이지 이탈 감지
  - `beforeunload` - 브라우저 닫기/새로고침
  - `visibilitychange` - 탭 전환/뒤로가기
  - `pagehide` - iOS Safari 지원

### Fixed
- 🐛 새로고침 시 그룹 탈퇴 처리 안 되던 문제 해결
- 🐛 뒤로가기 시 그룹 탈퇴 처리 안 되던 문제 해결
- 🐛 그룹장이 나가면 그룹이 삭제되던 문제 → 그룹장 인계로 변경

### Changed
- 🔄 그룹장 탈퇴 로직 변경
  - Before: 그룹장 나가면 그룹 전체 삭제
  - After: 멤버가 있으면 그룹장 인계, 없으면 삭제

---

## [1.1.0] - 2025-11-23

### Added
- ✨ 그룹 자동 탈퇴 기능
  - 브라우저 닫기 시 자동 탈퇴
  - 페이지 새로고침 시 자동 탈퇴
  - 탭 전환 시 자동 탈퇴
  - "그룹 나가기" 버튼 추가
- 🔄 세션 스토리지를 활용한 상태 관리
- ⚠️ 브라우저 종료 시 경고 메시지 (매칭 완료 전)

### Fixed
- 🐛 사용자가 브라우저를 닫아도 그룹에 남아있던 문제 해결
- 🐛 그룹장이 나가도 그룹이 남아있던 문제 해결 (그룹장 퇴장 시 그룹 삭제)

### API Changes
- `POST /api/group/leave` - 그룹 탈퇴 API 추가
  - Request: `{ groupId, sessionId }`
  - Response: `{ success, message }`
  - 그룹장이 나가면 그룹 전체 삭제
  - 일반 멤버는 탈퇴 처리 및 카운트 업데이트

### Technical Details
- `GroupService.removeMember()` - 멤버 탈퇴 메서드 추가
- `GroupService.deleteGroup()` - 그룹 삭제 메서드 추가
- `beforeunload` 이벤트 핸들러 추가
- `keepalive` fetch 옵션 사용으로 페이지 종료 시에도 요청 완료 보장

---

## [1.0.0] - 2025-11-23

### Initial Release
- 🎮 오버워치 5인 역할 고정 그룹 매칭 서비스
- 👤 비회원 임시 프로필 생성 (30분 자동 만료)
- 👑 그룹장/그룹원 모드 선택
- 🔍 자동 그룹 매칭 (역할 기반)
- ✅ 1T-2D-2H 역할 검증
- 🔄 실시간 그룹 현황 (5초 폴링)
- 👢 그룹장 강제 퇴장 기능
- 🎉 매칭 완료 감지 및 알림

### Tech Stack
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Supabase (PostgreSQL)
- Vercel (Deployment)
