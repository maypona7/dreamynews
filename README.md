# 학교 소식함 (Dreamy News)

Next.js 15(App Router) + Firebase 기반 학교 공지/소식 게시판입니다.

## 기능

- Google 로그인 + 사용자 역할(viewer / writer / admin) 분기
- 게시글 카드 목록 / 카테고리 필터 / pinned 우선 정렬 / 실시간 갱신
- 게시글 상세 모달 + 공유용 단일 페이지(`/posts/[id]`)
- Quill 에디터로 글 작성·수정, 이미지를 Cloud Storage로 업로드
- 고정 / 아카이브 / 삭제 등 게시글 상태 관리
- 게시글별 이모지 리액션(토글, 트랜잭션 집계)
- localStorage 기반 읽음 추적과 unread 배지
- 관리자 페이지: 멤버 역할 / 가입 승인 / 초대 링크 / 카테고리 / 자동승인 토글

## 기술 스택

- Next.js 15, React 18, TypeScript, TailwindCSS
- Firebase (Auth, Firestore, Storage), Firebase Admin SDK
- TanStack Query, Zod, Quill (`react-quill-new`)

## 로컬 실행

1. `.env.example`을 `.env.local`로 복사하고 Firebase 자격 증명을 채웁니다.

   ```
   cp .env.example .env.local
   ```

2. Firebase 설정
   - Firebase 콘솔에서 프로젝트 생성 → Web 앱 추가 → `NEXT_PUBLIC_FIREBASE_*` 채우기.
   - Authentication → Sign-in method 에서 **Google** 활성화.
   - Firestore 활성화 (기본 모드).
   - Cloud Storage 활성화.
   - 서비스 계정(IAM 콘솔)을 만들어 `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`를 채웁니다. `\n`은 그대로 두면 됩니다.

3. 보안 규칙 / 인덱스 배포 (Firebase CLI 필요)

   ```
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```

4. 의존성 설치 및 개발 서버

   ```
   npm install
   npm run dev
   ```

5. 첫 번째로 가입한 Google 계정은 자동으로 **admin**으로 승격됩니다.

## 디렉터리 구조

```
app/
  (auth)         로그인/대기/거절 페이지
  (main)         소식 피드, 게시글 상세/모달, 작성·수정
  (admin)        멤버/초대링크/카테고리/설정
  api/auth/...   세션 쿠키 동기화
  actions/       Server Actions (posts, reactions, members, invites, categories, settings)
  invite/[code]  초대 코드 사용 흐름
components/      재사용 UI 컴포넌트
lib/
  auth/          AuthProvider, 서버 세션 헬퍼
  firebase/      client/admin SDK, Firestore converters, queries
  readTracker.ts localStorage 기반 unread 추적
  schemas.ts     Zod 입력 검증
  types.ts       공용 타입
firestore.rules  보안 규칙
storage.rules    Storage 규칙
```

## 메모

- 권한은 Firestore의 `users/{uid}.role`과 Firebase Custom Claim에 동시 저장되며, 서버 사이드 체크는 세션 쿠키 + Admin SDK로 수행합니다.
- 초대 링크: 관리자가 `/admin/invites`에서 발급하면 `${APP_URL}/invite/<code>` 형식의 URL이 생성됩니다. 링크로 가입한 사용자는 자동으로 승인 상태가 됩니다.
- 카테고리 / 자동승인 / 사이트 이름은 `/admin/settings`, `/admin/categories`에서 변경합니다.
