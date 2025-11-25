'use client';

import { useEffect, useState, useRef } from 'react';
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
  const hasLeft = useRef(false);

  // 그룹 탈퇴 함수
  const leaveGroup = async () => {
    if (hasLeft.current) return; // 중복 호출 방지
    hasLeft.current = true;

    try {
      await fetch('/api/group/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, sessionId }),
        // keepalive를 사용하여 페이지 닫힐 때도 요청 완료
        keepalive: true
      });
    } catch (error) {
      console.error('Failed to leave group:', error);
    }
  };

  // beforeunload 이벤트: 브라우저 닫기/새로고침 감지
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (status !== 'matched') {
        leaveGroup();
        // 브라우저에 경고 메시지 표시 (선택사항)
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [status, groupId, sessionId]);

  // beforeunload 이벤트: 페이지를 실제로 떠날 때만 감지
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (status !== 'matched') {
        // 페이지를 떠날 때 그룹 탈퇴
        leaveGroup();
        
        // 사용자에게 경고 (선택사항)
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [status, groupId, sessionId]);

  const fetchGroupData = async () => {
    try {
      const response = await fetch(`/api/group/${groupId}`, {
        // 캐시 방지를 위한 헤더 추가
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const result = await response.json();

      if (result.success) {
        console.log('[GroupLobby] 그룹 데이터:', JSON.stringify(result.data, null, 2));
        console.log('[GroupLobby] 멤버 목록:', result.data.members);
        result.data.members.forEach((m: any, idx: number) => {
          console.log(`[GroupLobby] 멤버 ${idx + 1}:`, JSON.stringify({
            nickname: m.profile?.nickname,
            tier: m.profile?.current_tier,
            heroes: m.profile?.main_heroes,
            fullProfile: m.profile
          }, null, 2));
        });
        const newMembers = result.data.members;
        const newStatus = result.data.group.status;

        // 새 멤버 참가 감지
        if (newMembers.length > members.length) {
          const newMember = newMembers.find(
            (nm: GroupMember) => !members.some(m => m.sessionId === nm.sessionId)
          );
          if (newMember && newMember.sessionId !== sessionId) {
            console.log(`새 멤버 참가: ${newMember.profile?.nickname} (${newMember.position})`);
            // 시각적 피드백을 위한 콘솔 로그
          }
        }

        // 그룹장 변경 감지
        const currentLeader = members.find((m: GroupMember) => m.isLeader);
        const newLeader = newMembers.find((m: GroupMember) => m.isLeader);
        
        if (currentLeader && newLeader && currentLeader.sessionId !== newLeader.sessionId) {
          // 그룹장이 변경되었음을 알림
          if (newLeader.sessionId === sessionId) {
            alert('당신이 새로운 그룹장이 되었습니다! 👑');
          } else {
            alert(`${newLeader.profile?.nickname}님이 새로운 그룹장이 되었습니다.`);
          }
        }

        setMembers(newMembers);
        
        // 상태 변경 감지 및 처리
        if (newStatus === 'matched' && status !== 'matched') {
          console.log('[GroupLobby] 🎉 매칭 완료 감지! 화면 전환 시작');
          setStatus(newStatus);
          
          // 매칭 완료 콜백 호출
          if (onMatchingComplete) {
            setTimeout(() => {
              onMatchingComplete();
            }, 500); // 짧은 딜레이 후 전환
          }
        } else {
          setStatus(newStatus);
        }
      }
    } catch (error) {
      console.error('Failed to fetch group data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 그룹 데이터 가져오기 - 2초마다 폴링 (더 빠른 업데이트)
  useEffect(() => {
    fetchGroupData();
    
    // 매칭 완료 전에만 폴링 계속
    if (status === 'waiting') {
      // 2초로 단축하여 더 빠른 업데이트
      const interval = setInterval(fetchGroupData, 2000);
      return () => clearInterval(interval);
    }
  }, [groupId, status]);

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

  // Flex 멤버 분리
  const flexMembers = members.filter(m => m.position === 'Flex');

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
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800">
                        {slot.member.profile?.nickname || '알 수 없음'}
                      </p>
                      {slot.member.isLeader && <span className="text-yellow-500">👑</span>}
                      {/* 티어 뱃지 */}
                      {slot.member.profile?.current_tier && (() => {
                        const tier = slot.member.profile.current_tier as any;
                        const displayTier = tier[slot.member.position] || tier.rank || Object.values(tier)[0] || 'N/A';
                        return (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                            {displayTier}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-sm text-gray-600">{slot.member.profile?.battle_tag}</p>
                    {slot.member.profile?.introduction && (
                      <p className="text-xs text-gray-500 mt-1">{slot.member.profile.introduction}</p>
                    )}
                    {/* 주요 영웅 */}
                    {slot.member.profile?.main_heroes && (() => {
                      // Flex 포지션은 영웅 표시 안 함
                      if (slot.member.position === 'Flex') {
                        return (
                          <div className="mt-2">
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-xs rounded border border-purple-200">
                              Flex (모든 포지션 가능)
                            </span>
                          </div>
                        );
                      }
                      
                      // main_heroes가 배열이면 그대로 사용, 객체면 position에 맞는 배열 추출
                      const heroes = Array.isArray(slot.member.profile.main_heroes)
                        ? slot.member.profile.main_heroes
                        : (slot.member.profile.main_heroes as any)[slot.member.position] || [];
                      
                      return heroes.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {heroes.map((hero: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded border border-blue-200">
                              {hero}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
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

      {/* Flex 멤버 섹션 */}
      {flexMembers.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
            <span className="px-3 py-1 bg-purple-500 text-white rounded-full text-sm">Flex</span>
            유연 포지션 ({flexMembers.length}명)
            <span className="text-sm font-normal text-gray-500">- 5명 달성 시 자동 배정됩니다</span>
          </h3>
          <div className="space-y-3">
            {flexMembers.map((member, index) => (
              <div
                key={member.id}
                className="p-4 rounded-lg border-2 bg-purple-50 border-purple-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Flex 아이콘 */}
                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-r from-blue-500 via-red-500 to-green-500">
                      F
                    </div>

                    {/* 멤버 정보 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800">
                          {member.profile?.nickname || '알 수 없음'}
                        </p>
                        {member.isLeader && <span className="text-yellow-500">👑</span>}
                      </div>
                      <p className="text-sm text-gray-600">{member.profile?.battle_tag}</p>
                      {member.profile?.introduction && (
                        <p className="text-xs text-gray-500 mt-1">{member.profile.introduction}</p>
                      )}
                      {/* 주요 영웅 (포지션별) */}
                      {member.profile?.main_heroes && (() => {
                        const mainHeroes = member.profile.main_heroes as any;
                        const positions = ['Tank', 'Damage', 'Support'];
                        
                        return (
                          <div className="mt-2 space-y-1">
                            {positions.map((pos) => {
                              const heroes = mainHeroes[pos] || [];
                              if (heroes.length === 0) return null;
                              
                              return (
                                <div key={pos} className="flex items-center gap-2 flex-wrap">
                                  <span className={`px-1.5 py-0.5 text-xs font-semibold rounded ${
                                    pos === 'Tank' ? 'bg-blue-100 text-blue-700' :
                                    pos === 'Damage' ? 'bg-red-100 text-red-700' :
                                    'bg-green-100 text-green-700'
                                  }`}>
                                    {pos}:
                                  </span>
                                  {heroes.map((hero: string, idx: number) => (
                                    <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded border border-blue-200">
                                      {hero}
                                    </span>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* 티어 배지 (오른쪽) - 포지션별 */}
                  <div className="flex flex-col gap-1 ml-4">
                    {member.profile?.current_tier && (() => {
                      const tier = member.profile.current_tier as any;
                      return (
                        <>
                          {tier.Tank && (
                            <span className="px-3 py-1 bg-blue-500 text-white text-sm font-semibold rounded text-center min-w-[80px]">
                              {tier.Tank}
                            </span>
                          )}
                          {tier.Damage && (
                            <span className="px-3 py-1 bg-red-500 text-white text-sm font-semibold rounded text-center min-w-[80px]">
                              {tier.Damage}
                            </span>
                          )}
                          {tier.Support && (
                            <span className="px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded text-center min-w-[80px]">
                              {tier.Support}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* 강제 퇴장 버튼 (그룹장 전용) */}
                  {isLeader && !member.isLeader && (
                    <button
                      onClick={() => handleKick(member.sessionId)}
                      className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition ml-2"
                    >
                      퇴장
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 매칭 완료 메시지 */}
      {status === 'matched' && (
        <div className="mt-6 p-4 bg-green-100 border-2 border-green-500 rounded-lg text-center">
          <p className="text-lg font-bold text-green-800">
            🎉 매칭이 완료되었습니다! 게임을 시작하세요!
          </p>
        </div>
      )}

      {/* 그룹 나가기 버튼 (매칭 완료 전에만 표시) */}
      {status === 'waiting' && (
        <div className="mt-4">
          <button
            onClick={async () => {
              if (confirm('정말로 그룹에서 나가시겠습니까?')) {
                await leaveGroup();
                window.location.href = '/'; // 홈으로 이동
              }
            }}
            className="w-full py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
          >
            그룹 나가기
          </button>
        </div>
      )}
    </div>
  );
}
