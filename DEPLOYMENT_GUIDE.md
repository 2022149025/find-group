# 배포 가이드

## 🚀 배포 옵션

### 옵션 1: Vercel 배포 (추천 ⭐)

Next.js 프로젝트에 가장 적합한 플랫폼입니다.

#### 장점
- ✅ Next.js API Routes 완벽 지원
- ✅ 자동 빌드 최적화
- ✅ Edge Functions 지원
- ✅ 무료 플랜 제공
- ✅ 설정 최소화

#### 배포 단계

1. **Vercel 계정 생성**
   - https://vercel.com 접속
   - GitHub 계정으로 로그인

2. **프로젝트 Import**
   - "Add New..." → "Project" 클릭
   - GitHub 리포지토리 선택
   - 또는 "Import Git Repository" 에서 URL 입력

3. **환경 변수 설정**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://zdnewnjvmthowbhpnkqc.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

4. **배포**
   - "Deploy" 버튼 클릭
   - 자동 빌드 및 배포 (2-3분 소요)

5. **완료!**
   - `https://your-project.vercel.app` 형태의 URL 제공

---

### 옵션 2: Cloudflare Pages (GitHub 연동)

#### 전제 조건
- ⚠️ Next.js API Routes가 Cloudflare Workers로 변환됨
- ⚠️ 일부 Next.js 기능 제한될 수 있음
- ✅ 전 세계 CDN 배포
- ✅ 무료 플랜 제공

#### 배포 단계

1. **GitHub 리포지토리 생성**
   ```bash
   cd /home/user/webapp
   git remote add origin https://github.com/YOUR_USERNAME/overwatch-matching.git
   git push -u origin main
   ```

2. **Cloudflare Pages 설정**
   - https://dash.cloudflare.com 로그인
   - "Workers & Pages" → "Create application"
   - "Pages" 탭 → "Connect to Git"
   - GitHub 리포지토리 선택

3. **빌드 설정**
   - Framework preset: `Next.js`
   - Build command: `npm run build`
   - Build output directory: `.next`
   - Node version: `20`

4. **환경 변수 설정**
   - Settings → Environment Variables
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://zdnewnjvmthowbhpnkqc.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

5. **배포**
   - "Save and Deploy" 클릭
   - 자동 빌드 및 배포

---

### 옵션 3: Netlify

#### 장점
- ✅ Next.js 지원
- ✅ 자동 배포
- ✅ 무료 플랜

#### 배포 단계

1. **Netlify 계정 생성**
   - https://netlify.com 접속
   - GitHub 계정으로 로그인

2. **프로젝트 Import**
   - "Add new site" → "Import an existing project"
   - GitHub 리포지토리 선택

3. **빌드 설정**
   - Build command: `npm run build`
   - Publish directory: `.next`

4. **환경 변수 설정**
   - Site settings → Environment variables
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://zdnewnjvmthowbhpnkqc.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

5. **배포**
   - "Deploy site" 클릭

---

## 📝 배포 전 체크리스트

- [ ] Supabase 프로젝트 생성 완료
- [ ] 데이터베이스 마이그레이션 실행 완료
- [ ] `.env.local` 파일에 Supabase URL과 Key 설정
- [ ] 로컬에서 빌드 테스트 (`npm run build`)
- [ ] 로컬에서 동작 확인 (`npm run dev`)
- [ ] GitHub 리포지토리 생성 (옵션 2, 3의 경우)
- [ ] 환경 변수 준비

## 🎯 추천 배포 플랫폼

**목적별 추천:**

1. **빠른 배포 & 안정성**: Vercel ⭐⭐⭐⭐⭐
2. **전 세계 CDN**: Cloudflare Pages ⭐⭐⭐⭐
3. **무료 호스팅**: Netlify ⭐⭐⭐⭐

**이 프로젝트의 경우 Vercel을 강력히 추천합니다!**

---

## 🔧 배포 후 확인 사항

1. **애플리케이션 접속**
   - 제공된 URL로 접속
   - 랜딩 페이지 확인

2. **프로필 생성 테스트**
   - "시작하기" 클릭
   - My Informations 입력
   - 프로필 생성 성공 확인

3. **그룹 매칭 테스트**
   - 그룹장으로 시작 테스트
   - 그룹원으로 시작 테스트
   - 대기실 확인

4. **Supabase 데이터 확인**
   - Supabase Table Editor에서 데이터 확인

---

## ❓ 문제 해결

### 빌드 오류
```bash
# 로컬에서 빌드 테스트
npm run build

# 오류 확인 및 수정
```

### 환경 변수 오류
- 환경 변수가 `NEXT_PUBLIC_` 접두사로 시작하는지 확인
- 배포 플랫폼에서 환경 변수가 올바르게 설정되었는지 확인
- 재배포 필요 (환경 변수 변경 시)

### API 오류
- Supabase 연결 확인
- RLS 정책 확인
- 네트워크 오류 확인

---

## 📚 추가 리소스

- [Next.js 배포 문서](https://nextjs.org/docs/deployment)
- [Vercel 문서](https://vercel.com/docs)
- [Cloudflare Pages 문서](https://developers.cloudflare.com/pages/)
- [Netlify 문서](https://docs.netlify.com/)
- [Supabase 문서](https://supabase.com/docs)
