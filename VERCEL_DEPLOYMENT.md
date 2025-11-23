# 🚀 Vercel 배포 가이드

## ✅ 준비 완료

코드가 GitHub 리포지토리에 푸시되었습니다:
- **리포지토리**: https://github.com/2022149025/find-group
- **브랜치**: main

## 📋 Vercel 배포 단계

### 1단계: Vercel 계정 생성

1. **Vercel 웹사이트 접속**
   - https://vercel.com 방문
   - "Sign Up" 클릭

2. **GitHub 계정으로 로그인**
   - "Continue with GitHub" 선택
   - GitHub 인증 승인
   - Vercel 권한 부여

### 2단계: 프로젝트 Import

1. **대시보드에서 프로젝트 생성**
   - "Add New..." 버튼 클릭
   - "Project" 선택

2. **GitHub 리포지토리 Import**
   - "Import Git Repository" 섹션에서
   - **리포지토리 검색**: `find-group`
   - 또는 직접 URL 입력: `https://github.com/2022149025/find-group`
   - "Import" 버튼 클릭

### 3단계: 프로젝트 설정

#### 기본 설정 (자동 감지됨)
```
Framework Preset: Next.js
Root Directory: ./
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

**변경 필요 없음!** Vercel이 자동으로 감지합니다.

#### 환경 변수 설정 (중요! ⚠️)

**Environment Variables** 섹션에서:

1. **첫 번째 변수 추가**
   ```
   Name: NEXT_PUBLIC_SUPABASE_URL
   Value: https://zdnewnjvmthowbhpnkqc.supabase.co
   ```
   - "Add" 버튼 클릭

2. **두 번째 변수 추가**
   ```
   Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkbmV3bmp2bXRob3diaHBua3FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MjMzMjAsImV4cCI6MjA3OTQ5OTMyMH0.j5Jw_dhTEh7jkJob4Vv0VwpEpN0ti4zTcZAj0PpA75I
   ```
   - "Add" 버튼 클릭

⚠️ **주의**: 환경 변수를 정확히 입력하세요. 오타가 있으면 Supabase 연결이 실패합니다.

### 4단계: 배포 시작

1. **배포 실행**
   - "Deploy" 버튼 클릭
   - 빌드 프로세스 시작 (2-3분 소요)

2. **빌드 로그 확인**
   - 실시간 빌드 로그 표시
   - 진행 상황 모니터링
   ```
   ✓ Compiled successfully
   ✓ Linting and checking validity of types
   ✓ Collecting page data
   ✓ Generating static pages
   ✓ Finalizing page optimization
   ```

3. **배포 완료 대기**
   - "Building..." → "Deploying..." → "Ready"
   - 약 2-3분 소요

### 5단계: 배포 확인

배포가 완료되면:

1. **프로덕션 URL 확인**
   - 예: `https://find-group.vercel.app`
   - 또는 `https://find-group-xxx.vercel.app`

2. **도메인 정보**
   - Production: `https://find-group.vercel.app`
   - Preview: Git 브랜치별 자동 생성
   - 자동 HTTPS 적용

### 6단계: 동작 테스트

1. **애플리케이션 접속**
   - 제공된 URL 클릭
   - 랜딩 페이지 확인

2. **프로필 생성 테스트**
   - "시작하기" 버튼 클릭
   - My Informations 입력
   - "프로필 생성" 클릭
   - 성공 확인

3. **그룹 매칭 테스트**
   - "그룹장으로 시작" 선택
   - 대기실 화면 확인
   - 또는 "그룹원으로 시작" 선택

4. **Supabase 데이터 확인**
   - Supabase 대시보드 접속
   - Table Editor → `temporary_profiles` 확인
   - 방금 생성한 프로필 데이터 확인

---

## 🎉 배포 완료!

축하합니다! 애플리케이션이 성공적으로 배포되었습니다.

### 배포된 URL
- **Production**: https://find-group.vercel.app (또는 자동 생성된 URL)
- **GitHub**: https://github.com/2022149025/find-group

---

## 🔄 자동 배포

이제부터 코드 변경 시 자동으로 배포됩니다:

1. **코드 수정**
   ```bash
   cd /home/user/webapp
   # 파일 수정...
   git add .
   git commit -m "Update feature"
   git push origin main
   ```

2. **자동 빌드 & 배포**
   - GitHub 푸시 감지
   - 자동 빌드 시작
   - 배포 완료 (2-3분)
   - 새 버전 배포

3. **알림**
   - 이메일로 배포 상태 알림
   - GitHub Commit 상태 업데이트

---

## ⚙️ Vercel 대시보드 기능

### 1. 프로젝트 설정
- **Settings** → **Environment Variables**
  - 환경 변수 추가/수정/삭제
  - Production, Preview, Development 환경별 설정

### 2. 도메인 설정
- **Settings** → **Domains**
  - 커스텀 도메인 연결
  - 예: `overwatch-matching.com`

### 3. 배포 히스토리
- **Deployments** 탭
  - 모든 배포 기록 확인
  - 이전 버전으로 롤백 가능

### 4. 분석
- **Analytics** 탭
  - 방문자 통계
  - 성능 지표
  - 에러 로그

### 5. 로그
- **Logs** 탭
  - 실시간 서버 로그
  - 에러 추적
  - API 요청 모니터링

---

## 🐛 문제 해결

### 빌드 실패 시

1. **로그 확인**
   - Vercel 대시보드 → Deployments → 실패한 배포 클릭
   - Build Logs 확인

2. **로컬에서 빌드 테스트**
   ```bash
   cd /home/user/webapp
   npm run build
   ```
   - 로컬에서 오류 해결 후 다시 푸시

### 환경 변수 오류

1. **변수 확인**
   - Settings → Environment Variables
   - 변수명과 값 재확인
   - 저장 후 "Redeploy" 클릭

### Supabase 연결 오류

1. **Supabase 확인**
   - 테이블이 생성되었는지 확인
   - RLS 정책 확인
   - API 키 유효성 확인

2. **환경 변수 재설정**
   - Vercel에서 변수 재입력
   - Redeploy

---

## 📊 배포 완료 체크리스트

- [x] GitHub 리포지토리 생성
- [x] 코드 푸시
- [ ] Vercel 계정 생성
- [ ] 프로젝트 Import
- [ ] 환경 변수 설정
- [ ] 배포 실행
- [ ] 배포 성공 확인
- [ ] 애플리케이션 테스트
- [ ] Supabase 데이터 확인

---

## 🎯 다음 단계

배포 완료 후:

1. **커스텀 도메인 연결** (선택사항)
   - Vercel Settings → Domains
   - 도메인 추가 및 DNS 설정

2. **모니터링 설정**
   - Vercel Analytics 활성화
   - 에러 추적 설정

3. **성능 최적화**
   - 이미지 최적화
   - 캐싱 전략 개선

4. **기능 추가**
   - 디스코드 봇 연동
   - 매칭 통계 대시보드
   - 세션 자동 만료 크론잡

---

## 📞 지원

문제가 발생하면:
- Vercel 문서: https://vercel.com/docs
- Next.js 문서: https://nextjs.org/docs
- Supabase 문서: https://supabase.com/docs

배포 성공을 기원합니다! 🚀
