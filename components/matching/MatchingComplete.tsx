'use client';

import { GroupMember } from '@/lib/services/groupService';

interface MatchingCompleteProps {
  members: GroupMember[];
  onNewMatch?: () => void;
}

export default function MatchingComplete({ members, onNewMatch }: MatchingCompleteProps) {
  const tankMembers = members.filter(m => m.position === 'Tank');
  const damageMembers = members.filter(m => m.position === 'Damage');
  const supportMembers = members.filter(m => m.position === 'Support');

  return (
    <div className="max-w-4xl mx-auto p-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-2xl text-white">
      {/* 헤더 */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-4 animate-bounce">🎉</div>
        <h1 className="text-4xl font-bold mb-2">매칭 완료!</h1>
        <p className="text-xl opacity-90">1 Tank - 2 Damage - 2 Support</p>
      </div>

      {/* 팀 구성 */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">팀 구성</h2>

        {/* Tank */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">T</span>
            Tank
          </h3>
          {tankMembers.map(member => (
            <div key={member.id} className="ml-10 p-3 bg-white/20 rounded-lg mb-2">
              <p className="font-semibold">
                {member.profile?.nickname}
                {member.isLeader && <span className="ml-2">👑</span>}
              </p>
              <p className="text-sm opacity-80">{member.profile?.battle_tag}</p>
              <p className="text-sm opacity-75">
                티어: {member.profile?.current_tier?.Tank || 'N/A'} | 
                영웅: {member.profile?.main_heroes?.Tank?.join(', ') || 'N/A'}
              </p>
            </div>
          ))}
        </div>

        {/* Damage */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">D</span>
            Damage
          </h3>
          {damageMembers.map(member => (
            <div key={member.id} className="ml-10 p-3 bg-white/20 rounded-lg mb-2">
              <p className="font-semibold">
                {member.profile?.nickname}
                {member.isLeader && <span className="ml-2">👑</span>}
              </p>
              <p className="text-sm opacity-80">{member.profile?.battle_tag}</p>
              <p className="text-sm opacity-75">
                티어: {member.profile?.current_tier?.Damage || 'N/A'} | 
                영웅: {member.profile?.main_heroes?.Damage?.join(', ') || 'N/A'}
              </p>
            </div>
          ))}
        </div>

        {/* Support */}
        <div>
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">S</span>
            Support
          </h3>
          {supportMembers.map(member => (
            <div key={member.id} className="ml-10 p-3 bg-white/20 rounded-lg mb-2">
              <p className="font-semibold">
                {member.profile?.nickname}
                {member.isLeader && <span className="ml-2">👑</span>}
              </p>
              <p className="text-sm opacity-80">{member.profile?.battle_tag}</p>
              <p className="text-sm opacity-75">
                티어: {member.profile?.current_tier?.Support || 'N/A'} | 
                영웅: {member.profile?.main_heroes?.Support?.join(', ') || 'N/A'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-4">
        <button
          onClick={onNewMatch}
          className="flex-1 py-3 bg-white text-purple-600 font-bold rounded-lg hover:bg-gray-100 transition"
        >
          새로운 매칭 시작
        </button>
      </div>
    </div>
  );
}
