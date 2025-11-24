-- =====================================================
-- 외래 키 제약 조건 문제 해결
-- =====================================================

-- 1. 기존 Foreign Key 제약 조건 제거
ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_leader_session_id_fkey;
ALTER TABLE group_members DROP CONSTRAINT IF EXISTS group_members_group_id_fkey;
ALTER TABLE group_members DROP CONSTRAINT IF EXISTS group_members_session_id_fkey;

-- 2. RLS 비활성화 재확인 (이미 했지만 확실히)
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE temporary_profiles DISABLE ROW LEVEL SECURITY;

-- 3. 기존 데이터 정리 (선택사항)
-- TRUNCATE TABLE group_members CASCADE;
-- TRUNCATE TABLE groups CASCADE;
-- TRUNCATE TABLE temporary_profiles CASCADE;

-- 4. 테스트 데이터 삽입
-- 4-1. 프로필 생성
INSERT INTO temporary_profiles (
  session_id,
  nickname,
  battle_tag,
  main_position,
  current_tier
) VALUES (
  'test-session-001',
  'TestUser',
  'Test#1234',
  'Support',
  'Gold'
) ON CONFLICT (session_id) DO NOTHING;

-- 4-2. 그룹 생성 (이제 성공해야 함)
INSERT INTO groups (
  leader_session_id,
  tank_count,
  damage_count,
  support_count,
  total_members,
  status
) VALUES (
  'test-session-001',
  0,
  0,
  1,
  1,
  'waiting'
) RETURNING *;

-- 4-3. 그룹 멤버 추가
INSERT INTO group_members (
  group_id,
  session_id,
  position,
  is_leader
) VALUES (
  (SELECT id FROM groups WHERE leader_session_id = 'test-session-001' LIMIT 1),
  'test-session-001',
  'Support',
  true
);

-- 5. 결과 확인
SELECT 'Profiles:', COUNT(*) FROM temporary_profiles;
SELECT 'Groups:', COUNT(*) FROM groups;
SELECT 'Members:', COUNT(*) FROM group_members;

-- 6. 상세 조회
SELECT * FROM temporary_profiles ORDER BY created_at DESC LIMIT 3;
SELECT * FROM groups ORDER BY created_at DESC LIMIT 3;
SELECT * FROM group_members ORDER BY joined_at DESC LIMIT 3;
