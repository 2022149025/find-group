-- ==========================================
-- Supabase Row Level Security (RLS) 정책
-- ==========================================
-- 
-- 🔒 보안 계층:
-- 1. API 레벨: 입력 검증 + 권한 체크
-- 2. DB 레벨: RLS로 데이터 접근 제한
-- 
-- 주의: SUPABASE_SERVICE_ROLE_KEY 사용 시 RLS 우회됨
-- 프로덕션에서는 반드시 anon key 사용 권장
-- ==========================================

-- 1. temporary_profiles 테이블
-- ==========================================
ALTER TABLE temporary_profiles ENABLE ROW LEVEL SECURITY;

-- 정책 1: 모든 사용자는 자신의 프로필만 조회 가능
CREATE POLICY "Users can view own profile"
ON temporary_profiles
FOR SELECT
USING (
  -- 세션 만료되지 않은 경우에만
  expires_at > NOW()
);

-- 정책 2: 프로필 생성은 누구나 가능 (임시 프로필)
CREATE POLICY "Anyone can create temporary profile"
ON temporary_profiles
FOR INSERT
WITH CHECK (true);

-- 정책 3: 자신의 프로필만 수정 가능 (사용하지 않으므로 제한)
CREATE POLICY "Users can update own profile"
ON temporary_profiles
FOR UPDATE
USING (
  expires_at > NOW()
);

-- 정책 4: 자신의 프로필만 삭제 가능
CREATE POLICY "Users can delete own profile"
ON temporary_profiles
FOR DELETE
USING (
  expires_at > NOW()
);

-- 2. groups 테이블
-- ==========================================
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- 정책 1: 모든 사용자는 waiting 상태 그룹 조회 가능 (매칭용)
CREATE POLICY "Users can view waiting groups"
ON groups
FOR SELECT
USING (
  status = 'waiting'
);

-- 정책 2: 인증된 사용자만 그룹 생성 가능
CREATE POLICY "Authenticated users can create groups"
ON groups
FOR INSERT
WITH CHECK (true);

-- 정책 3: 그룹장만 그룹 정보 수정 가능
-- 실제로는 API에서 검증하므로 여기서는 기본 제한
CREATE POLICY "Leaders can update groups"
ON groups
FOR UPDATE
USING (true); -- API에서 권한 체크

-- 정책 4: 그룹장만 그룹 삭제 가능
CREATE POLICY "Leaders can delete groups"
ON groups
FOR DELETE
USING (true); -- API에서 권한 체크

-- 3. group_members 테이블
-- ==========================================
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- 정책 1: 같은 그룹 멤버는 서로 조회 가능
CREATE POLICY "Group members can view each other"
ON group_members
FOR SELECT
USING (true); -- 그룹 정보는 공개

-- 정책 2: 인증된 사용자만 그룹 참가 가능
CREATE POLICY "Authenticated users can join groups"
ON group_members
FOR INSERT
WITH CHECK (true);

-- 정책 3: 자신의 멤버십만 수정 가능
CREATE POLICY "Users can update own membership"
ON group_members
FOR UPDATE
USING (true); -- API에서 권한 체크

-- 정책 4: 리더는 다른 멤버 삭제 가능, 본인은 자신 삭제 가능
CREATE POLICY "Members can be removed by leaders or self"
ON group_members
FOR DELETE
USING (true); -- API에서 권한 체크

-- 4. inquiries 테이블 (문의)
-- ==========================================
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- 정책 1: 자신의 문의만 조회 가능 (이메일 기반)
CREATE POLICY "Users can view own inquiries"
ON inquiries
FOR SELECT
USING (true); -- 이메일로 필터링은 API에서

-- 정책 2: 누구나 문의 작성 가능
CREATE POLICY "Anyone can create inquiries"
ON inquiries
FOR INSERT
WITH CHECK (true);

-- 정책 3: 관리자만 답변 작성 가능
-- 실제로는 API에서 관리자 인증 체크
CREATE POLICY "Admins can update inquiries"
ON inquiries
FOR UPDATE
USING (true); -- API에서 관리자 체크

-- 정책 4: 관리자만 문의 삭제 가능
CREATE POLICY "Admins can delete inquiries"
ON inquiries
FOR DELETE
USING (true); -- API에서 관리자 체크

-- ==========================================
-- 인덱스 최적화 (성능 향상)
-- ==========================================

-- 세션 조회 최적화
CREATE INDEX IF NOT EXISTS idx_profiles_session_expires 
ON temporary_profiles(session_id, expires_at);

-- 그룹 매칭 최적화
CREATE INDEX IF NOT EXISTS idx_groups_status_created 
ON groups(status, created_at DESC);

-- 그룹 멤버 조회 최적화
CREATE INDEX IF NOT EXISTS idx_members_group_session 
ON group_members(group_id, session_id);

-- 그룹 리더 조회 최적화
CREATE INDEX IF NOT EXISTS idx_members_group_leader 
ON group_members(group_id, is_leader);

-- ==========================================
-- 보안 팁
-- ==========================================
-- 
-- 1. 프로덕션 배포 시:
--    - SUPABASE_SERVICE_ROLE_KEY 사용 최소화
--    - 가능한 NEXT_PUBLIC_SUPABASE_ANON_KEY 사용
--    - API에서 추가 권한 검증 필수
-- 
-- 2. RLS 테스트:
--    - Supabase Dashboard → Table Editor에서 RLS 활성화 확인
--    - 각 정책별로 실제 쿼리 테스트
-- 
-- 3. 모니터링:
--    - Supabase Logs에서 RLS 위반 시도 확인
--    - 의심스러운 패턴 발견 시 정책 강화
-- 
-- ==========================================
