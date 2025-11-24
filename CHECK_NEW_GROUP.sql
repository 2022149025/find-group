-- 방금 생성된 그룹 확인
SELECT * FROM groups WHERE id = '528cee23-c878-454d-8c28-fd4ac252752b';

-- 이 그룹의 멤버 확인
SELECT * FROM group_members WHERE group_id = '528cee23-c878-454d-8c28-fd4ac252752b';

-- 이 세션의 프로필 확인
SELECT * FROM temporary_profiles WHERE session_id = 'test-api-session-999';
