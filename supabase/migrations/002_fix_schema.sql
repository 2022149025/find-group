-- 기존 정책 및 테이블 완전 삭제
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS temporary_profiles CASCADE;

-- temporary_profiles 테이블 생성
CREATE TABLE temporary_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT UNIQUE NOT NULL,
    nickname TEXT NOT NULL CHECK (char_length(nickname) BETWEEN 2 AND 15),
    battle_tag TEXT NOT NULL,
    introduction TEXT CHECK (char_length(introduction) <= 50),
    main_position TEXT NOT NULL CHECK (main_position IN ('Tank', 'Damage', 'Support')),
    current_tier JSONB NOT NULL,
    main_heroes JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- groups 테이블 생성
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leader_session_id TEXT NOT NULL REFERENCES temporary_profiles(session_id) ON DELETE CASCADE,
    tank_count INT DEFAULT 0 CHECK (tank_count <= 1),
    damage_count INT DEFAULT 0 CHECK (damage_count <= 2),
    support_count INT DEFAULT 0 CHECK (support_count <= 2),
    total_members INT DEFAULT 1 CHECK (total_members <= 5),
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    matched_at TIMESTAMPTZ
);

-- group_members 테이블 생성
CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL REFERENCES temporary_profiles(session_id) ON DELETE CASCADE,
    position TEXT NOT NULL CHECK (position IN ('Tank', 'Damage', 'Support')),
    is_leader BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, session_id)
);

-- 인덱스 생성
CREATE INDEX idx_groups_status ON groups(status);
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_temporary_profiles_expires_at ON temporary_profiles(expires_at);
CREATE INDEX idx_temporary_profiles_session_id ON temporary_profiles(session_id);

-- RLS (Row Level Security) 활성화
ALTER TABLE temporary_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- temporary_profiles 정책
DROP POLICY IF EXISTS "Public read access" ON temporary_profiles;
DROP POLICY IF EXISTS "Public insert access" ON temporary_profiles;
DROP POLICY IF EXISTS "Public delete access" ON temporary_profiles;
DROP POLICY IF EXISTS "Public update access" ON temporary_profiles;

CREATE POLICY "Public read access" ON temporary_profiles FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON temporary_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete access" ON temporary_profiles FOR DELETE USING (true);
CREATE POLICY "Public update access" ON temporary_profiles FOR UPDATE USING (true);

-- groups 정책
DROP POLICY IF EXISTS "Public read groups" ON groups;
DROP POLICY IF EXISTS "Public insert groups" ON groups;
DROP POLICY IF EXISTS "Public update groups" ON groups;
DROP POLICY IF EXISTS "Public delete groups" ON groups;

CREATE POLICY "Public read groups" ON groups FOR SELECT USING (true);
CREATE POLICY "Public insert groups" ON groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update groups" ON groups FOR UPDATE USING (true);
CREATE POLICY "Public delete groups" ON groups FOR DELETE USING (true);

-- group_members 정책
DROP POLICY IF EXISTS "Public read members" ON group_members;
DROP POLICY IF EXISTS "Public insert members" ON group_members;
DROP POLICY IF EXISTS "Public delete members" ON group_members;
DROP POLICY IF EXISTS "Public update members" ON group_members;

CREATE POLICY "Public read members" ON group_members FOR SELECT USING (true);
CREATE POLICY "Public insert members" ON group_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete members" ON group_members FOR DELETE USING (true);
CREATE POLICY "Public update members" ON group_members FOR UPDATE USING (true);

-- 테이블 생성 확인
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('temporary_profiles', 'groups', 'group_members')
ORDER BY table_name;
