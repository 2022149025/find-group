/**
 * 입력 검증 및 보안 유틸리티
 */

// XSS 방지: HTML 태그 제거
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// SQL Injection 방지: 특수문자 검증
export function isValidInput(input: string, maxLength: number = 500): boolean {
  if (!input || typeof input !== 'string') return false;
  if (input.length > maxLength) return false;
  
  // 위험한 SQL 키워드 차단
  const dangerousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
    /(;|--|\/\*|\*\/|xp_|sp_)/gi
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(input));
}

// 이메일 검증
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

// UUID 검증
export function isValidUUID(uuid: string): boolean {
  if (!uuid) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// 배틀태그 검증 (예: PlayerName#1234)
export function isValidBattleTag(battleTag: string): boolean {
  if (!battleTag) return false;
  const battleTagRegex = /^[a-zA-Z0-9가-힣]{2,12}#[0-9]{4,5}$/;
  return battleTagRegex.test(battleTag) && battleTag.length <= 20;
}

// 닉네임 검증
export function isValidNickname(nickname: string): boolean {
  if (!nickname) return false;
  // 2-20자, 한글/영문/숫자만 허용
  const nicknameRegex = /^[a-zA-Z0-9가-힣]{2,20}$/;
  return nicknameRegex.test(nickname);
}

// 포지션 검증
export function isValidPosition(position: string): position is 'Tank' | 'Damage' | 'Support' | 'Flex' {
  return ['Tank', 'Damage', 'Support', 'Flex'].includes(position);
}

// 티어 검증
const validTiers = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster', 'Champion'];
export function isValidTier(tier: string): boolean {
  return validTiers.includes(tier);
}

// 영웅 검증
const validHeroes = [
  // Tank
  'D.Va', '둠피스트', '정커퀸', '마우가', '오리사', '라마트라', '라인하르트', 
  '로드호그', '시그마', '윈스턴', '레킹볼', '자리야',
  // Damage
  '애쉬', '바스티온', '캐서디', '에코', '겐지', '행크', '정크랫', '메이', 
  '파라', '리퍼', '소전', '솔저:76', '솜브라', '시메트라', '토르비욘', 
  '트레이서', '벤처', '위도우메이커',
  // Support
  '아나', '바티스트', '브리기테', '일리아리', '재니', '키리코', '라이프위버', 
  '루시우', '메르시', '모이라'
];

export function isValidHero(hero: string): boolean {
  return validHeroes.includes(hero);
}

// Rate Limiting용 간단한 메모리 캐시
const requestCache = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 10, 
  windowMs: number = 60000 // 1분
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const cached = requestCache.get(identifier);
  
  if (!cached || now > cached.resetTime) {
    // 새로운 윈도우 시작
    requestCache.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  if (cached.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  
  cached.count++;
  return { allowed: true, remaining: maxRequests - cached.count };
}

// 주기적으로 만료된 캐시 정리
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of requestCache.entries()) {
      if (now > value.resetTime) {
        requestCache.delete(key);
      }
    }
  }, 60000); // 1분마다 정리
}
