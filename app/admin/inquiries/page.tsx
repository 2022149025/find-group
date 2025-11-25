'use client';

import { useState, useEffect } from 'react';
import { Inquiry } from '@/lib/services/inquiryService';

type Category = 'bug' | 'feature' | 'suggestion' | 'other';

const categoryLabels: Record<Category, string> = {
  bug: '🐛 버그 신고',
  feature: '✨ 기능 요청',
  suggestion: '💡 개선 제안',
  other: '💬 기타 문의'
};

// 관리자 PIN 코드 (환경변수 또는 하드코딩)
const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || '1234';

export default function AdminInquiriesPage() {
  // 인증 상태
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState('');

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [filteredInquiries, setFilteredInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'answered'>('all');
  
  // 답변 작성 상태
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 세션 스토리지에서 인증 상태 복구
  useEffect(() => {
    const authenticated = sessionStorage.getItem('admin_authenticated');
    if (authenticated === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // 관리자 인증
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (pinInput === ADMIN_PIN) {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_authenticated', 'true');
      setAuthError('');
    } else {
      setAuthError('관리자 번호가 올바르지 않습니다.');
      setPinInput('');
    }
  };

  // 로그아웃
  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('admin_authenticated');
    setPinInput('');
  };

  // 문의 목록 조회
  const fetchInquiries = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/inquiry/admin');
      const result = await response.json();

      if (result.success) {
        setInquiries(result.data);
        filterInquiries(result.data, statusFilter);
      } else {
        setError(result.error || '문의 목록 조회에 실패했습니다.');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 필터링
  const filterInquiries = (data: Inquiry[], filter: 'all' | 'pending' | 'answered') => {
    if (filter === 'all') {
      setFilteredInquiries(data);
    } else {
      setFilteredInquiries(data.filter(i => i.status === filter));
    }
  };

  // 필터 변경
  const handleFilterChange = (filter: 'all' | 'pending' | 'answered') => {
    setStatusFilter(filter);
    filterInquiries(inquiries, filter);
  };

  // 답변 작성
  const handleReply = async (inquiryId: string) => {
    if (!replyText.trim()) {
      setError('답변 내용을 입력해주세요.');
      return;
    }

    if (replyText.trim().length < 10) {
      setError('답변은 최소 10자 이상 입력해주세요.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/inquiry/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiryId,
          adminReply: replyText
        })
      });

      const result = await response.json();

      if (result.success) {
        // 성공 시 목록 새로고침
        await fetchInquiries();
        setReplyingTo(null);
        setReplyText('');
        alert('답변이 성공적으로 등록되었습니다.');
      } else {
        setError(result.error || '답변 등록에 실패했습니다.');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // 초기 로드
  useEffect(() => {
    if (isAuthenticated) {
      fetchInquiries();
    }
  }, [isAuthenticated]);

  // 인증되지 않은 경우 로그인 화면 표시
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 py-8 px-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🔒</div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">관리자 인증</h1>
              <p className="text-gray-600">관리자 번호를 입력해주세요</p>
            </div>

            <form onSubmit={handleAuth}>
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">
                  관리자 번호
                </label>
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-center text-2xl tracking-widest"
                  placeholder="••••"
                  maxLength={4}
                  autoFocus
                  required
                />
              </div>

              {authError && (
                <div className="mb-4 p-3 bg-red-100 border-2 border-red-400 rounded-lg">
                  <p className="text-red-700 text-center">{authError}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition"
              >
                인증하기
              </button>

              <button
                type="button"
                onClick={() => window.location.href = '/'}
                className="w-full mt-3 py-3 bg-gray-400 text-white font-semibold rounded-lg hover:bg-gray-500 transition"
              >
                홈으로 돌아가기
              </button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 text-center">
                💡 기본 관리자 번호는 <code className="bg-gray-200 px-2 py-1 rounded">1234</code>입니다.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 py-8 px-4">
      {/* 헤더 */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">관리자 - 문의 관리</h1>
            <p className="text-gray-600 mt-2">사용자 문의를 확인하고 답변할 수 있습니다.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              🔓 로그아웃
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              홈으로
            </button>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex gap-2 bg-white rounded-lg p-2 shadow">
          <button
            onClick={() => handleFilterChange('all')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            📋 전체 ({inquiries.length})
          </button>
          <button
            onClick={() => handleFilterChange('pending')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
              statusFilter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            ⏳ 대기중 ({inquiries.filter(i => i.status === 'pending').length})
          </button>
          <button
            onClick={() => handleFilterChange('answered')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
              statusFilter === 'answered'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            ✅ 답변완료 ({inquiries.filter(i => i.status === 'answered').length})
          </button>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="max-w-6xl mx-auto mb-6 p-4 bg-red-100 border-2 border-red-400 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <p className="text-red-700">{error}</p>
              <button
                onClick={() => setError('')}
                className="mt-2 px-4 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 문의 목록 */}
      <div className="max-w-6xl mx-auto">
        {loading ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-5xl mb-4">⏳</div>
            <p className="text-gray-600">문의 목록을 불러오는 중...</p>
          </div>
        ) : filteredInquiries.length > 0 ? (
          <div className="space-y-4">
            {filteredInquiries.map((inquiry) => (
              <div
                key={inquiry.id}
                className={`bg-white rounded-lg shadow-lg p-6 border-2 ${
                  inquiry.status === 'answered'
                    ? 'border-green-300'
                    : 'border-yellow-300'
                }`}
              >
                {/* 문의 정보 */}
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            inquiry.status === 'answered'
                              ? 'bg-green-500 text-white'
                              : 'bg-yellow-500 text-white'
                          }`}
                        >
                          {inquiry.status === 'answered' ? '✅ 답변완료' : '⏳ 대기중'}
                        </span>
                        <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">
                          {categoryLabels[inquiry.category]}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-800 mb-2">{inquiry.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <span>👤 {inquiry.name}</span>
                        <span>📧 {inquiry.email}</span>
                        <span>📅 {new Date(inquiry.createdAt).toLocaleString('ko-KR')}</span>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                        {inquiry.content}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 기존 답변 표시 */}
                {inquiry.status === 'answered' && inquiry.adminReply && (
                  <div className="mb-4 p-4 bg-green-50 rounded-lg border-2 border-green-300">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-green-700">✅ 등록된 답변</span>
                      <span className="text-sm text-gray-500">
                        {new Date(inquiry.repliedAt!).toLocaleString('ko-KR')}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{inquiry.adminReply}</p>
                  </div>
                )}

                {/* 답변 작성 폼 */}
                {inquiry.status === 'pending' && (
                  <div className="mt-4 border-t-2 pt-4">
                    {replyingTo === inquiry.id ? (
                      <div>
                        <label className="block text-gray-700 font-semibold mb-2">
                          답변 작성
                        </label>
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                          rows={6}
                          placeholder="답변 내용을 입력하세요 (최소 10자)"
                        />
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleReply(inquiry.id)}
                            disabled={submitting}
                            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                          >
                            {submitting ? '등록 중...' : '답변 등록'}
                          </button>
                          <button
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyText('');
                            }}
                            className="px-6 py-2 bg-gray-400 text-white font-semibold rounded-lg hover:bg-gray-500 transition"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setReplyingTo(inquiry.id)}
                        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
                      >
                        💬 답변 작성하기
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-600">
              {statusFilter === 'pending' && '대기 중인 문의가 없습니다.'}
              {statusFilter === 'answered' && '답변 완료된 문의가 없습니다.'}
              {statusFilter === 'all' && '등록된 문의가 없습니다.'}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
