'use client';

import { useEffect, useState } from 'react';
import { GroupMember } from '@/lib/services/groupService';

interface GroupLobbyProps {
  groupId: string;
  sessionId: string;
  isLeader: boolean;
  onKickMember?: (targetSessionId: string) => void;
  onMatchingComplete?: () => void;
}

interface RoleSlot {
  position: 'Tank' | 'Damage' | 'Support';
  member: GroupMember | null;
}

export default function GroupLobby({ groupId, sessionId, isLeader, onKickMember, onMatchingComplete }: GroupLobbyProps) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [status, setStatus] = useState<'waiting' | 'matched'>('waiting');
  const [loading, setLoading] = useState(true);

  // 그룹 데이터 가져오기
  useEffect(() => {
    fetchGroupData();
    
    // 5초마다 폴링 (실시간 업데이트를 위한 간단한 방법)
    const interval = setInterval(fetchGroupData, 5000);
    
    return () => clearInterval(interval);
  }, [groupId]);

  const fetchGroupData = async () => {
    try {
      const response = await fetch(`/api/group/${groupId}`);
      const result = await response.json();

      if (result.success) {
        setMembers(result.data.members);
        setStatus(result.data.group.status);

        if (result.data.group.status === 'matched' && status === 'waiting') {
          onMatchingComplete?.();
        }
      }
    } catch (error) {
      console.error('Failed to fetch group data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKick = async (targetSessionId: string) => {
    if (!isLeader) return;

    try {
      const response = await fetch('/api/group/kick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          leaderSessionId: sessionId,
          targetSessionId
        })
      });

      if (response.ok) {
        onKickMember?.(targetSessionId);
        fetchGroupData();
      }
    } catch (error) {
      console.error('Failed to kick member:', error);
    }
  };

  // 역할 슬롯 생성 (1T-2D-2H)
  const roleSlots: RoleSlot[] = [
    { position: 'Tank', member: members.find(m => m.position === 'Tank') || null },
    { position: 'Damage', member: members.filter(m => m.position === 'Damage')[0] || null },
    { position: 'Damage', member: members.filter(m => m.position === 'Damage')[1] || null },
    { position: 'Support', member: members.filter(m => m.position === 'Support')[0] || null },
    { position: 'Support', member: members.filter(m => m.position === 'Support')[1] || null }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">그룹 대기실</h2>
        <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
          status === 'matched' 
            ? 'bg-green-100 text-green-700' 
            : 'bg-yellow-100 text-yellow-700'
        }`}>
          {status === 'matched' ? '매칭 완료!' : `대기 중 (${members.length}/5)`}
        </div>
      </div>

      {/* 역할 슬롯 */}
      <div className="space-y-4">
        {roleSlots.map((slot, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border-2 ${
              slot.member 
                ? 'bg-green-50 border-green-300' 
                : 'bg-gray-50 border-gray-300 border-dashed'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* 포지션 아이콘 */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                  slot.position === 'Tank' ? 'bg-blue-500' :
                  slot.position === 'Damage' ? 'bg-red-500' :
                  'bg-green-500'
                }`}>
                  {slot.position[0]}
                </div>

                {/* 멤버 정보 */}
                {slot.member ? (
                  <div>
                    <p className="font-semibold text-gray-800">
                      {slot.member.profile?.nickname}
                      {slot.member.isLeader && <span className="ml-2 text-yellow-500">👑</span>}
                    </p>
                    <p className="text-sm text-gray-600">{slot.member.profile?.battle_tag}</p>
                    <p className="text-xs text-gray-500">{slot.member.profile?.introduction}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-500">{slot.position} 대기 중...</p>
                  </div>
                )}
              </div>

              {/* 강제 퇴장 버튼 (그룹장 전용) */}
              {isLeader && slot.member && !slot.member.isLeader && (
                <button
                  onClick={() => handleKick(slot.member!.sessionId)}
                  className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition"
                >
                  퇴장
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 매칭 완료 메시지 */}
      {status === 'matched' && (
        <div className="mt-6 p-4 bg-green-100 border-2 border-green-500 rounded-lg text-center">
          <p className="text-lg font-bold text-green-800">
            🎉 매칭이 완료되었습니다! 게임을 시작하세요!
          </p>
        </div>
      )}
    </div>
  );
}
