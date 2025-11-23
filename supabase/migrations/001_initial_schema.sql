-- temporary_profiles 테이블
CREATE TABLE IF NOT EXISTS temporary_profiles (
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

-- groups 테이블
CREATE TABLE IF NOT EXISTS groups (
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

-- group_members 테이블
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL REFERENCES temporary_profiles(session_id) ON DELETE CASCADE,
    position TEXT NOT NULL CHECK (position IN ('Tank', 'Damage', 'Support')),
    is_leader BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, session_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_groups_status ON groups(status);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_temporary_profiles_expires_at ON temporary_profiles(expires_at);
CREATE INDEX IF NOT EXISTS idx_temporary_profiles_session_id ON temporary_profiles(session_id);

-- RLS (Row Level Security) 활성화
ALTER TABLE temporary_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Public 읽기/쓰기 권한 (비회원 서비스)
CREATE POLICY "Public read access" ON temporary_profiles FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON temporary_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete access" ON temporary_profiles FOR DELETE USING (true);
CREATE POLICY "Public update access" ON temporary_profiles FOR UPDATE USING (true);

CREATE POLICY "Public read groups" ON groups FOR SELECT USING (true);
CREATE POLICY "Public insert groups" ON groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update groups" ON groups FOR UPDATE USING (true);
CREATE POLICY "Public delete groups" ON groups FOR DELETE USING (true);

CREATE POLICY "Public read members" ON group_members FOR SELECT USING (true);
CREATE POLICY "Public insert members" ON group_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete members" ON group_members FOR DELETE USING (true);
CREATE POLICY "Public update members" ON group_members FOR UPDATE USING (true);
