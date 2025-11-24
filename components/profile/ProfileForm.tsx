'use client';

import { useState } from 'react';
import { ProfileInput } from '@/lib/services/profileService';

const POSITIONS = ['Tank', 'Damage', 'Support', 'Flex'] as const;
const TIERS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster', 'Top 500'];

// 영웅 데이터: 한글명, 영문명, 초상화 URL
interface Hero {
  name: string;      // 한글명
  enName: string;    // 영문명 (API 저장용)
  portrait: string;  // 초상화 URL
}

const HEROES: Record<string, Hero[]> = {
  Tank: [
    { name: '디바', enName: 'D.Va', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/ca114f72193e4d58a85c087e9409242f1a31e808cf4058678b8cbf767c2a9a0a.png' },
    { name: '둠피스트', enName: 'Doomfist', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/13750471c693c1a360eb19d5ace229c8599a729cd961d72ebee0e157657b7d18.png' },
    { name: '라마트라', enName: 'Ramattra', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/3e0367155e1940a24da076c6f1f065aacede88dbc323631491aa0cd5a51e0b66.png' },
    { name: '라인하르트', enName: 'Reinhardt', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/490d2f79f8547d6e364306af60c8184fb8024b8e55809e4cc501126109981a65.png' },
    { name: '레킹볼', enName: 'Wrecking Ball', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/68e62b7cf5c642358f2857953e8786c4b50771dba4615f0ebcd2b150552134aa.png' },
    { name: '로드호그', enName: 'Roadhog', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/32ac97f3811e6d4b75135a7e4c9a16deabaf130df7932fa0e22d8e247d7b62ac.png' },
    { name: '마우가', enName: 'Mauga', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/50de0e12db076076d804a7392cda645409494edb879d8e4bdeb3e07537bdc5e2.png' },
    { name: '오리사', enName: 'Orisa', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/71e96294617e81051d120b5d04b491bb1ea40e2933da44d6631aae149aac411d.png' },
    { name: '윈스턴', enName: 'Winston', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/bd9c8e634d89488459dfc1aeb21b602fa5c39aa05601a4167682f3a3fed4e0ee.png' },
    { name: '자리야', enName: 'Zarya', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/8819ba85823136640d8eba2af6fd7b19d46b9ee8ab192a4e06f396d1e5231f7a.png' },
    { name: '정커퀸', enName: 'Junker Queen', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/6811ebce329726f45a96e54f530d9121038962109098c8c155fb5aedfa7e7477.png' },
    { name: '시그마', enName: 'Sigma', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/cd65e0762ebcebdce42dfbbb9812ce44db7cb17fcff9c6f8e0595b7d66cf1c04.png' }
  ].sort((a, b) => a.name.localeCompare(b.name, 'ko')),
  
  Damage: [
    { name: '겐지', enName: 'Genji', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/4edf5ea6d58c449a2aeb619a3fda9fff36a069dfbe4da8bc5d8ec1c758ddb8dc.png' },
    { name: '리퍼', enName: 'Reaper', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/2edb9af69d987bb503cd31e4ba00c5d7c99d8c921c008a7a6a4c5832c1cd420a.png' },
    { name: '메이', enName: 'Mei', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/dd3bd3cb0d8326d461021e87b58d191c07a010ººe4c1eea7e1b2ff88919cf.png' },
    { name: '바스티온', enName: 'Bastion', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/4d715f722c42215072b5dd0240904aaed7b5285df0b2b082d633339a1ce0f3e7.png' },
    { name: '벤처', enName: 'Venture', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/8e44fd98f7a4c61c9dbabb06ca577c5543f4dfc80058c0133846efeaa77e1b60.png' },
    { name: '솔저: 76', enName: 'Soldier: 76', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/20b4ef00ed05d6dba75df228241ed528df7b6c9556f04c8070830965e1576bf7.png' },
    { name: '솜브라', enName: 'Sombra', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/bca8532688f01b071806063b9472f1c0f9fc9c7948e6b59e210006e69cec9022.png' },
    { name: '소전', enName: 'Sojourn', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/a53bf7ad9d2f33aaf9199a00989f86d4ba1f67c281ba550312c7d96e70fec4ea.png' },
    { name: '시메트라', enName: 'Symmetra', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/7f2024c5387c9d76d944a5db021c2774d1e9d7cbf39e9b6a35b364d38ea250ae.png' },
    { name: '애쉬', enName: 'Ashe', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/8dc2a024c9b7d95c7141b2ef065590dbc8d9018d12ad15f76b01923986702228.png' },
    { name: '에코', enName: 'Echo', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/f086bf235cc6b7f138609594218a8385c8e5f6405a39eceb0deb9afb429619fe.png' },
    { name: '위도우메이커', enName: 'Widowmaker', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/a714f1cb8937447164325e06ecfab7dd1dea28aae4e573e17cd8e6053bae1b35.png' },
    { name: '정크랫', enName: 'Junkrat', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/037e3df083624e5480f8996821287479a375f62b470572a22773da0eaf9441d0.png' },
    { name: '캐서디', enName: 'Cassidy', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/6cfb48b5597b657c2eafb1277dc5eef4a07eae90c265fcd37ed798189619f0a5.png' },
    { name: '토르비욘', enName: 'Torbjörn', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/9d54e7df509427a96b9b8e045990b2f4e69238c81223e4d458e99e0c822671a8.png' },
    { name: '트레이서', enName: 'Tracer', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/a66413200e934da19540afac965cebf90dca5c1e87bb8db673c349a48175e4c.png' },
    { name: '파라', enName: 'Pharah', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/f8261595eca3e43e3b37cadb8161902cc416e38b7e0caa855f4555001156d814.png' },
    { name: '한조', enName: 'Hanzo', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/aecd8fa677f0093344fab7ccb7c37516c764df3f5ff339a5a845a030a27ba7e0.png' }
  ].sort((a, b) => a.name.localeCompare(b.name, 'ko')),
  
  Support: [
    { name: '루시우', enName: 'Lúcio', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/e2ff2527610a0fbe0c9956f80925123ef3e66c213004373f6829e3353e8a7836.png' },
    { name: '리우', enName: 'Lifeweaver', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/39d4514f1b858bc228035b09d5a74ed41f8eeefc9a0d1873570b216ba04334df.png' },
    { name: '메르시', enName: 'Mercy', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/2508ddd39a178d5f6ae993ab43eeb3e7961e5a54a9507e6ae347381193f28943.png' },
    { name: '모이라', enName: 'Moira', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/000beeb5606e01497897fa9210dd3b1e78e1159ebfd8afdc9e989047d7d3d08f.png' },
    { name: '바티스트', enName: 'Baptiste', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/f979896f74d1cb0838c8a9d7c9f6c5e2f10e2b8febc84feb943e235809d99487.png' },
    { name: '브리기테', enName: 'Brigitte', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/48392820c6976ee1cd8dde13e71df85bf15560083ee5c8658fe7c298095d619a.png' },
    { name: '아나', enName: 'Ana', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/3429c394716364bbef802180e9763d04812757c205e1b4568bc321772096ed86.png' },
    { name: '주노', enName: 'Juno', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/9c1eced847252e829abcc7e01be664f5992fa78fb04e003ee00c67fc1f5f27b7.png' },
    { name: '키리코', enName: 'Kiriko', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/088aff2153bdfa426984b1d5c912f6af0ab313f0865a81be0edd114e9a2f79f9.png' },
    { name: '젠야타', enName: 'Zenyatta', portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/71e96294617e81051d120b5d04b491bb1ea40e2933da44d6631aae149aac411d.png' }
  ].sort((a, b) => a.name.localeCompare(b.name, 'ko')),
  
  Flex: []
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

  const handleHeroToggle = (position: string, heroEnName: string) => {
    const currentHeroes = formData.mainHeroes?.[position] || [];
    const newHeroes = currentHeroes.includes(heroEnName)
      ? currentHeroes.filter(h => h !== heroEnName)
      : currentHeroes.length < 3
      ? [...currentHeroes, heroEnName]
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
        {POSITIONS.map(position => {
          // Flex 포지션은 영웅 선택 불필요 (모든 포지션 가능)
          if (position === 'Flex') {
            return (
              <div key={position} className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  {position} - 모든 포지션 가능 (영웅 선택 불필요)
                </p>
              </div>
            );
          }
          
          return (
          <div key={position} className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              {position} ({formData.mainHeroes?.[position]?.length || 0}/3)
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {HEROES[position].map(hero => {
                const isSelected = formData.mainHeroes?.[position]?.includes(hero.enName) || false;
                return (
                  <button
                    key={hero.enName}
                    type="button"
                    onClick={() => handleHeroToggle(position, hero.enName)}
                    className={`flex flex-col items-center p-2 rounded-lg transition ${
                      isSelected
                        ? 'bg-blue-600 ring-2 ring-blue-400'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                    title={hero.name}
                  >
                    <img
                      src={hero.portrait}
                      alt={hero.name}
                      className="w-12 h-12 rounded-full mb-1"
                    />
                    <span className={`text-xs font-medium ${
                      isSelected ? 'text-white' : 'text-gray-700'
                    }`}>
                      {hero.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          );
        })}
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
