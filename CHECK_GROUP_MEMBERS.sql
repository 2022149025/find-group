-- =====================================================
-- 그룹 멤버 데이터 확인
-- =====================================================

-- 1. 최근 생성된 그룹 확인
SELECT 
  id,
  leader_session_id,
  tank_count,
  damage_count,
  support_count,
  total_members,
  status,
  created_at
FROM groups 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. 그룹 멤버 확인
SELECT 
  gm.id,
  gm.group_id,
  gm.session_id,
  gm.position,
  gm.is_leader,
  gm.joined_at,
  g.leader_session_id as group_leader
FROM group_members gm
LEFT JOIN groups g ON gm.group_id = g.id
ORDER BY gm.joined_at DESC 
LIMIT 10;

-- 3. 그룹별 멤버 수 확인
SELECT 
  g.id as group_id,
  g.leader_session_id,
  g.total_members as claimed_members,
  COUNT(gm.id) as actual_members,
  g.created_at
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
GROUP BY g.id, g.leader_session_id, g.total_members, g.created_at
ORDER BY g.created_at DESC
LIMIT 10;

-- 4. 문제 진단: 멤버가 없는 그룹 찾기
SELECT 
  g.id,
  g.leader_session_id,
  g.total_members,
  g.created_at,
  COUNT(gm.id) as member_count
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
GROUP BY g.id, g.leader_session_id, g.total_members, g.created_at
HAVING COUNT(gm.id) = 0
ORDER BY g.created_at DESC;
