'use client';

import { useState } from 'react';
import { Inquiry } from '@/lib/services/inquiryService';

type Category = 'bug' | 'feature' | 'suggestion' | 'other';

const categoryLabels: Record<Category, string> = {
  bug: '🐛 버그 신고',
  feature: '✨ 기능 요청',
  suggestion: '💡 개선 제안',
  other: '💬 기타 문의'
};

const categoryDescriptions: Record<Category, string> = {
  bug: '오류나 버그를 발견하셨나요?',
  feature: '새로운 기능을 제안해주세요',
  suggestion: '더 나은 서비스를 위한 제안',
  other: '기타 문의사항'
};

export default function InquiryPage() {
  const [step, setStep] = useState<'form' | 'list' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 폼 데이터
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<Category>('suggestion');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // 문의 목록
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [searchEmail, setSearchEmail] = useState('');

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/inquiry/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          category,
          title,
          content
        })
      });

      const result = await response.json();

      if (result.success) {
        setSuccessMessage(result.message);
        setStep('success');
        // 폼 초기화
        setName('');
        setEmail('');
        setCategory('suggestion');
        setTitle('');
        setContent('');
      } else {
        setError(result.error || '문의 접수에 실패했습니다.');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 문의 목록 조회
  const handleSearchInquiries = async () => {
    if (!searchEmail) {
      setError('이메일을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/inquiry/list?email=${encodeURIComponent(searchEmail)}`);
      const result = await response.json();

      if (result.success) {
        setInquiries(result.data);
      } else {
        setError(result.error || '문의 조회에 실패했습니다.');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 py-8 px-4">
      {/* 헤더 */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">1:1 문의</h1>
            <p className="text-gray-600 mt-2">문의사항을 남겨주시면 빠른 시일 내에 답변드리겠습니다.</p>
          </div>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            홈으로
          </button>
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex gap-2 bg-white rounded-lg p-2 shadow">
          <button
            onClick={() => setStep('form')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
              step === 'form' || step === 'success'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            📝 문의하기
          </button>
          <button
            onClick={() => setStep('list')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
              step === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            📋 내 문의 확인
          </button>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="max-w-4xl mx-auto mb-6 p-4 bg-red-100 border-2 border-red-400 rounded-lg">
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

      {/* 문의 작성 폼 */}
      {step === 'form' && (
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8">
            {/* 이름 */}
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="이름을 입력하세요"
                required
              />
            </div>

            {/* 이메일 */}
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">
                이메일 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="example@email.com"
                required
              />
              <p className="text-sm text-gray-500 mt-1">답변을 받을 이메일 주소를 입력해주세요.</p>
            </div>

            {/* 문의 유형 */}
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-3">
                문의 유형 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(Object.keys(categoryLabels) as Category[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`p-4 rounded-lg border-2 transition text-left ${
                      category === cat
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-semibold text-gray-800 mb-1">{categoryLabels[cat]}</div>
                    <div className="text-sm text-gray-600">{categoryDescriptions[cat]}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 제목 */}
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="문의 제목을 입력하세요"
                required
              />
            </div>

            {/* 내용 */}
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">
                문의 내용 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                rows={8}
                placeholder="문의 내용을 자세히 작성해주세요."
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                최대한 자세히 작성해주시면 더 정확한 답변을 드릴 수 있습니다.
              </p>
            </div>

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              {loading ? '제출 중...' : '문의 접수하기'}
            </button>
          </form>
        </div>
      )}

      {/* 문의 성공 */}
      {step === 'success' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">문의가 접수되었습니다</h2>
            <p className="text-gray-600 mb-2">{successMessage}</p>
            <p className="text-gray-500 text-sm mb-8">
              답변은 입력하신 이메일로 발송됩니다.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setStep('form')}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
              >
                새 문의 작성
              </button>
              <button
                onClick={() => setStep('list')}
                className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition"
              >
                내 문의 확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 문의 목록 */}
      {step === 'list' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            {/* 이메일 검색 */}
            <div className="mb-8">
              <label className="block text-gray-700 font-semibold mb-2">
                이메일로 문의 내역 확인
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="문의 시 입력한 이메일"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchInquiries()}
                />
                <button
                  onClick={handleSearchInquiries}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                  {loading ? '조회 중...' : '조회'}
                </button>
              </div>
            </div>

            {/* 문의 목록 */}
            {inquiries.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  총 {inquiries.length}개의 문의
                </h3>
                {inquiries.map((inquiry) => (
                  <div
                    key={inquiry.id}
                    className={`p-6 rounded-lg border-2 ${
                      inquiry.status === 'answered'
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-300 bg-gray-50'
                    }`}
                  >
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
                        <h4 className="text-xl font-bold text-gray-800 mb-2">{inquiry.title}</h4>
                        <p className="text-gray-600 whitespace-pre-wrap">{inquiry.content}</p>
                      </div>
                    </div>

                    {/* 답변 */}
                    {inquiry.status === 'answered' && inquiry.adminReply && (
                      <div className="mt-4 p-4 bg-white rounded-lg border-2 border-green-300">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-green-700">운영자 답변</span>
                          <span className="text-sm text-gray-500">
                            {new Date(inquiry.repliedAt!).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{inquiry.adminReply}</p>
                      </div>
                    )}

                    <div className="mt-3 text-sm text-gray-500">
                      문의 일시: {new Date(inquiry.createdAt).toLocaleString('ko-KR')}
                    </div>
                  </div>
                ))}
              </div>
            ) : searchEmail ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-5xl mb-4">📭</div>
                <p>해당 이메일로 접수된 문의가 없습니다.</p>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-5xl mb-4">📧</div>
                <p>이메일을 입력하고 조회 버튼을 눌러주세요.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
