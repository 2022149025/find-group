/**
 * 비밀번호 해싱 및 검증 (bcrypt 대체)
 * bcrypt는 Node.js 네이티브 모듈이므로 Edge Runtime에서 사용 불가
 * Web Crypto API를 사용한 안전한 해싱
 */

// PBKDF2를 사용한 비밀번호 해싱
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  
  // Salt 생성 (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // PBKDF2로 해싱 (100,000 iterations)
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    data,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  
  // Salt + Hash를 Base64로 인코딩
  const hashArray = new Uint8Array(derivedBits);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt);
  combined.set(hashArray, salt.length);
  
  return btoa(String.fromCharCode(...combined));
}

// 비밀번호 검증
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    
    // Base64 디코딩
    const combined = Uint8Array.from(atob(hashedPassword), c => c.charCodeAt(0));
    
    // Salt와 Hash 분리 (salt는 첫 16 bytes)
    const salt = combined.slice(0, 16);
    const originalHash = combined.slice(16);
    
    // 입력된 비밀번호로 해시 재생성
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      data,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );
    
    const newHash = new Uint8Array(derivedBits);
    
    // 타이밍 공격 방지를 위한 상수 시간 비교
    if (newHash.length !== originalHash.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < newHash.length; i++) {
      result |= newHash[i] ^ originalHash[i];
    }
    
    return result === 0;
  } catch (error) {
    console.error('[Password Verification Error]', error);
    return false;
  }
}

// 비밀번호 강도 검증
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('비밀번호는 최소 8자 이상이어야 합니다.');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('소문자를 최소 1개 포함해야 합니다.');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('대문자를 최소 1개 포함해야 합니다.');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('숫자를 최소 1개 포함해야 합니다.');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('특수문자를 최소 1개 포함해야 합니다.');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// 환경변수 비밀번호 검증 (간단한 버전)
export function verifyEnvPassword(inputPassword: string, envPassword: string): boolean {
  // 개발 환경에서는 간단한 비교
  // 프로덕션에서는 반드시 해시된 비밀번호 사용 권장
  return inputPassword === envPassword;
}
