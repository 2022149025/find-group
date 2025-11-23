# Changelog

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
