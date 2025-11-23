'use client';

interface ModeSelectorProps {
  sessionId: string;
  position: 'Tank' | 'Damage' | 'Support';
  onModeSelect: (mode: 'leader' | 'member') => void;
  loading?: boolean;
}

export default function ModeSelector({ sessionId, position, onModeSelect, loading = false }: ModeSelectorProps) {
  return (
    <div className="max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">
        모드 선택
      </h2>
      <p className="text-center text-gray-600 mb-8">
        주 포지션: <span className="font-semibold text-blue-600">{position}</span>
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* 그룹장으로 시작 */}
        <button
          onClick={() => onModeSelect('leader')}
          disabled={loading}
          className="p-8 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-lg hover:from-blue-600 hover:to-blue-800 transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <div className="text-center">
            <div className="text-5xl mb-4">👑</div>
            <h3 className="text-2xl font-bold mb-2">그룹장으로 시작</h3>
            <p className="text-blue-100">
              새로운 그룹을 생성하고 멤버를 기다립니다
            </p>
            <ul className="mt-4 text-sm text-left text-blue-100 space-y-1">
              <li>✓ 그룹 생성 및 관리</li>
              <li>✓ 멤버 강제 퇴장 권한</li>
              <li>✓ 자동 매칭 대기</li>
            </ul>
          </div>
        </button>

        {/* 그룹원으로 시작 */}
        <button
          onClick={() => onModeSelect('member')}
          disabled={loading}
          className="p-8 bg-gradient-to-br from-green-500 to-green-700 text-white rounded-lg hover:from-green-600 hover:to-green-800 transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <div className="text-center">
            <div className="text-5xl mb-4">👥</div>
            <h3 className="text-2xl font-bold mb-2">그룹원으로 시작</h3>
            <p className="text-green-100">
              기존 그룹에 자동으로 참가합니다
            </p>
            <ul className="mt-4 text-sm text-left text-green-100 space-y-1">
              <li>✓ 빠른 매칭</li>
              <li>✓ 자동 그룹 탐색</li>
              <li>✓ 즉시 플레이 가능</li>
            </ul>
          </div>
        </button>
      </div>

      {loading && (
        <div className="mt-6 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">처리 중...</p>
        </div>
      )}
    </div>
  );
}
