'use client';

import { useState } from 'react';
import { ProfileInput } from '@/lib/services/profileService';

const POSITIONS = ['Tank', 'Damage', 'Support'] as const;
const TIERS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster', 'Top 500'];
const HEROES: Record<string, string[]> = {
  Tank: ['D.Va', 'Doomfist', 'Junker Queen', 'Orisa', 'Ramattra', 'Reinhardt', 'Roadhog', 'Sigma', 'Winston', 'Wrecking Ball', 'Zarya'],
  Damage: ['Ashe', 'Bastion', 'Cassidy', 'Echo', 'Genji', 'Hanzo', 'Junkrat', 'Mei', 'Pharah', 'Reaper', 'Sojourn', 'Soldier: 76', 'Sombra', 'Symmetra', 'Torbjörn', 'Tracer', 'Widowmaker'],
  Support: ['Ana', 'Baptiste', 'Brigitte', 'Kiriko', 'Lifeweaver', 'Lúcio', 'Mercy', 'Moira', 'Zenyatta']
};

interface ProfileFormProps {
  onSubmit: (profile: ProfileInput) => void;
  loading?: boolean;
}

export default function ProfileForm({ onSubmit, loading = false }: ProfileFormProps) {
  const [formData, setFormData] = useState<Partial<ProfileInput>>({
    nickname: '',
    battleTag: '',
    introduction: '',
    mainPosition: 'Tank',
    currentTier: {},
    mainHeroes: {}
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nickname || formData.nickname.length < 2 || formData.nickname.length > 15) {
      newErrors.nickname = '닉네임은 2~15자여야 합니다';
    }

    if (!formData.battleTag) {
      newErrors.battleTag = '배틀태그를 입력해주세요';
    }

    if (formData.introduction && formData.introduction.length > 50) {
      newErrors.introduction = '자기소개는 50자 이하여야 합니다';
    }

    if (!formData.currentTier || Object.keys(formData.currentTier).length === 0) {
      newErrors.currentTier = '최소 하나의 티어를 선택해주세요';
    }

    if (!formData.mainHeroes || Object.keys(formData.mainHeroes).length === 0) {
      newErrors.mainHeroes = '최소 하나의 영웅을 선택해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData as ProfileInput);
    }
  };

  const handleHeroToggle = (position: string, hero: string) => {
    const currentHeroes = formData.mainHeroes?.[position] || [];
    const newHeroes = currentHeroes.includes(hero)
      ? currentHeroes.filter(h => h !== hero)
      : currentHeroes.length < 3
      ? [...currentHeroes, hero]
      : currentHeroes;

    setFormData({
      ...formData,
      mainHeroes: {
        ...formData.mainHeroes,
        [position]: newHeroes
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">My Informations</h2>

      {/* 닉네임 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          닉네임 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.nickname}
          onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="2~15자"
        />
        {errors.nickname && <p className="mt-1 text-sm text-red-500">{errors.nickname}</p>}
      </div>

      {/* 배틀태그 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          배틀태그 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.battleTag}
          onChange={(e) => setFormData({ ...formData, battleTag: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="예: Player#1234"
        />
        {errors.battleTag && <p className="mt-1 text-sm text-red-500">{errors.battleTag}</p>}
      </div>

      {/* 자기소개 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          한줄 자기소개
        </label>
        <textarea
          value={formData.introduction}
          onChange={(e) => setFormData({ ...formData, introduction: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="최대 50자"
          rows={2}
        />
        {errors.introduction && <p className="mt-1 text-sm text-red-500">{errors.introduction}</p>}
      </div>

      {/* 주 포지션 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          주 포지션 <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-4">
          {POSITIONS.map(position => (
            <button
              key={position}
              type="button"
              onClick={() => setFormData({ ...formData, mainPosition: position })}
              className={`px-6 py-2 rounded-md font-medium transition ${
                formData.mainPosition === position
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {position}
            </button>
          ))}
        </div>
      </div>

      {/* 현재 티어 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          현재 티어 (포지션별) <span className="text-red-500">*</span>
        </label>
        {POSITIONS.map(position => (
          <div key={position} className="mb-3">
            <p className="text-sm text-gray-600 mb-1">{position}</p>
            <select
              value={formData.currentTier?.[position] || ''}
              onChange={(e) => setFormData({
                ...formData,
                currentTier: {
                  ...formData.currentTier,
                  [position]: e.target.value
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">선택하세요</option>
              {TIERS.map(tier => (
                <option key={tier} value={tier}>{tier}</option>
              ))}
            </select>
          </div>
        ))}
        {errors.currentTier && <p className="mt-1 text-sm text-red-500">{errors.currentTier}</p>}
      </div>

      {/* 주요 영웅 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          주요 영웅 (포지션별 최대 3개) <span className="text-red-500">*</span>
        </label>
        {POSITIONS.map(position => (
          <div key={position} className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              {position} ({formData.mainHeroes?.[position]?.length || 0}/3)
            </p>
            <div className="flex flex-wrap gap-2">
              {HEROES[position].map(hero => {
                const isSelected = formData.mainHeroes?.[position]?.includes(hero) || false;
                return (
                  <button
                    key={hero}
                    type="button"
                    onClick={() => handleHeroToggle(position, hero)}
                    className={`px-3 py-1 text-sm rounded-full transition ${
                      isSelected
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {hero}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {errors.mainHeroes && <p className="mt-1 text-sm text-red-500">{errors.mainHeroes}</p>}
      </div>

      {/* 제출 버튼 */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
      >
        {loading ? '생성 중...' : '프로필 생성'}
      </button>
    </form>
  );
}
