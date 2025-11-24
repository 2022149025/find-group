-- =====================================================
-- Flex 포지션을 지원하도록 DB 스키마 수정
-- Supabase SQL Editor에서 실행하세요:
-- https://supabase.com/dashboard/project/zdnewnjvmthowbhpnkqc/editor
-- =====================================================

-- 1. temporary_profiles 테이블의 main_position CHECK 제약 조건 확인
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'temporary_profiles'::regclass 
AND contype = 'c';

-- 2. 기존 CHECK 제약 조건 삭제
ALTER TABLE temporary_profiles 
DROP CONSTRAINT IF EXISTS temporary_profiles_main_position_check;

-- 3. Flex를 포함한 새로운 CHECK 제약 조건 추가
ALTER TABLE temporary_profiles
ADD CONSTRAINT temporary_profiles_main_position_check 
CHECK (main_position IN ('Tank', 'Damage', 'Support', 'Flex'));

-- 4. group_members 테이블도 동일하게 수정
ALTER TABLE group_members 
DROP CONSTRAINT IF EXISTS group_members_position_check;

ALTER TABLE group_members
ADD CONSTRAINT group_members_position_check 
CHECK (position IN ('Tank', 'Damage', 'Support', 'Flex'));

-- 5. 검증: 테스트 데이터 삽입 (성공해야 함)
-- INSERT INTO temporary_profiles (
--   session_id, 
--   nickname, 
--   battle_tag, 
--   main_position, 
--   current_tier, 
--   main_heroes, 
--   expires_at
-- ) VALUES (
--   'test-flex-' || NOW()::text,
--   'FlexTestUser',
--   'FlexTest#1234',
--   'Flex',
--   '{"Tank": "Gold", "Damage": "Silver", "Support": "Platinum"}'::jsonb,
--   '{}'::jsonb,
--   NOW() + INTERVAL '30 minutes'
-- ) RETURNING *;

-- 성공하면 위의 주석을 제거하고 실행해서 테스트하세요
