'use client';

import { useState, useEffect } from 'react';
import ProfileForm from '@/components/profile/ProfileForm';
import ModeSelector from '@/components/mode/ModeSelector';
import GroupLobby from '@/components/group/GroupLobby';
import MatchingComplete from '@/components/matching/MatchingComplete';
import { ProfileInput, TemporaryProfile } from '@/lib/services/profileService';
import { GroupMember } from '@/lib/services/groupService';

type Step = 'landing' | 'profile' | 'mode' | 'lobby' | 'matched';

export default function Home() {
  const [step, setStep] = useState<Step>('landing');
  const [profile, setProfile] = useState<TemporaryProfile | null>(null);
  const [groupId, setGroupId] = useState<string>('');
  const [isLeader, setIsLeader] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [matchedMembers, setMatchedMembers] = useState<GroupMember[]>([]);

  // 세션 스토리지에서 현재 그룹 정보 저장/복구
  useEffect(() => {
    // 그룹 대기실에 있을 때만 저장
    if (step === 'lobby' && groupId && profile) {
      sessionStorage.setItem('currentGroup', JSON.stringify({
        groupId,
        sessionId: profile.sessionId,
        timestamp: Date.now(),
        step: step
      }));
    } else {
      // 다른 단계에서는 정리
      sessionStorage.removeItem('currentGroup');
    }
  }, [step, groupId, profile]);

  // 페이지 로드 시 미완료 그룹에서 자동 탈퇴
  useEffect(() => {
    const handlePageLoad = async () => {
      const savedGroup = sessionStorage.getItem('currentGroup');
      if (savedGroup) {
        try {
          const { groupId, sessionId, timestamp, step: savedStep } = JSON.parse(savedGroup);
          
          // 5분 이내의 세션만 처리 (너무 오래된 세션 무시)
          if (Date.now() - timestamp < 5 * 60 * 1000 && savedStep === 'lobby') {
            // 페이지 재로드인 경우 그룹에서 탈퇴
            await fetch('/api/group/leave', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ groupId, sessionId }),
              keepalive: true
            });
          }
        } catch (error) {
          console.error('Failed to cleanup on page load:', error);
        }
        
        // 세션 스토리지 정리
        sessionStorage.removeItem('currentGroup');
      }
    };

    handlePageLoad();
  }, []);

  // 프로필 생성
  const handleProfileSubmit = async (profileInput: ProfileInput) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/profile/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileInput)
      });

      const result = await response.json();

      if (result.success) {
        setProfile(result.data);
        setStep('mode');
      } else {
        setError(result.error || '프로필 생성에 실패했습니다.');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 모드 선택 (그룹장 또는 그룹원)
  const handleModeSelect = async (mode: 'leader' | 'member') => {
    if (!profile) return;

    setLoading(true);
    setError('');

    try {
      if (mode === 'leader') {
        // 그룹장으로 시작
        const response = await fetch('/api/group/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: profile.sessionId,
            position: profile.mainPosition
          })
        });

        const result = await response.json();

        if (result.success) {
          setGroupId(result.data.id);
          setIsLeader(true);
          setStep('lobby');
        } else {
          setError(result.error || '그룹 생성에 실패했습니다.');
        }
      } else {
        // 그룹원으로 시작
        const response = await fetch('/api/group/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: profile.sessionId,
            position: profile.mainPosition
          })
        });

        const result = await response.json();

        if (result.success) {
          setGroupId(result.data.groupId);
          setIsLeader(false);
          setStep('lobby');
        } else {
          // 디버그 정보 출력
          if (result.debug) {
            console.log('[그룹 매칭 실패] 디버그 정보:', result.debug);
          }
          
          // 사용자 친화적인 에러 메시지
          if (result.debug?.waitingGroups === 0) {
            setError(`현재 대기 중인 그룹이 없습니다.\n\n"그룹장으로 시작" 버튼을 눌러 새 그룹을 만들어보세요!`);
          } else {
            setError(`${profile.mainPosition} 포지션의 빈자리가 있는 그룹을 찾지 못했습니다.\n\n잠시 후 다시 시도하거나 "그룹장으로 시작"을 선택해주세요.`);
          }
        }
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 매칭 완료 처리
  const handleMatchingComplete = async () => {
    try {
      const response = await fetch(`/api/group/${groupId}`);
      const result = await response.json();

      if (result.success) {
        setMatchedMembers(result.data.members);
        setStep('matched');
      }
    } catch (err) {
      console.error('Failed to fetch matched group:', err);
    }
  };

  // 새로운 매칭 시작
  const handleNewMatch = async () => {
    // 현재 그룹에서 탈퇴 처리
    if (groupId && profile) {
      try {
        await fetch('/api/group/leave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupId,
            sessionId: profile.sessionId
          })
        });
      } catch (error) {
        console.error('Failed to leave group:', error);
      }
    }

    setStep('landing');
    setProfile(null);
    setGroupId('');
    setIsLeader(false);
    setMatchedMembers([]);
    setError('');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 py-8 px-4">
      {/* 헤더 */}
      <div className="max-w-6xl mx-auto mb-8">
        <h1 className="text-4xl font-bold text-center text-gray-800">
          오버워치 5인큐 매칭
        </h1>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-100 border-2 border-red-400 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <p className="text-red-700 whitespace-pre-line">{error}</p>
              <button
                onClick={() => setError('')}
                className="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 랜딩 페이지 */}
      {step === 'landing' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-6">🎮</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              빠른 그룹 매칭 시작하기
            </h2>
            <button
              onClick={() => setStep('profile')}
              className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition"
            >
              시작하기
            </button>
          </div>

          {/* 서비스 설명 */}
          <div className="mt-8 grid md:grid-cols-1 gap-6">
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <div className="text-4xl mb-3">🎯</div>
              <h3 className="font-bold text-gray-800 mb-2">역할 고정: 1탱2딜2힐 역할고정 매칭</h3>
            </div>
          </div>
        </div>
      )}

      {/* 프로필 입력 */}
      {step === 'profile' && (
        <ProfileForm onSubmit={handleProfileSubmit} loading={loading} />
      )}

      {/* 모드 선택 */}
      {step === 'mode' && profile && (
        <ModeSelector
          sessionId={profile.sessionId}
          position={profile.mainPosition}
          onModeSelect={handleModeSelect}
          loading={loading}
        />
      )}

      {/* 그룹 대기실 */}
      {step === 'lobby' && profile && groupId && (
        <GroupLobby
          groupId={groupId}
          sessionId={profile.sessionId}
          isLeader={isLeader}
          onMatchingComplete={handleMatchingComplete}
        />
      )}

      {/* 매칭 완료 */}
      {step === 'matched' && (
        <MatchingComplete
          members={matchedMembers}
          onNewMatch={handleNewMatch}
        />
      )}
    </main>
  );
}
