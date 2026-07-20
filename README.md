# Nook — 미니 노션 (Mini Notion)

개인 업무를 기록하는 나만의 작은 공간. Claude Design 프로젝트 **"Nook"** 디자인 시스템과
와이어프레임을 그대로 옮겨, **로그인 · 글 목록 · 글 상세 편집 · 마이 페이지**를
하나의 Next.js 서비스로 결합했습니다.

## 실행

```bash
npm install
npm run dev      # http://localhost:3000
```

로그인(구글 OAuth)을 쓰려면 프로젝트 루트에 `.env.local`이 필요합니다:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon 공개 키>
```

또한 Supabase 대시보드에서 **Google provider를 켜고**(Client ID/Secret 등록),
Authentication → URL Configuration에 `http://localhost:3000`을 Redirect URL로 허용해야 합니다.
Google Cloud OAuth 클라이언트의 승인된 리디렉션 URI에는
`https://<project-ref>.supabase.co/auth/v1/callback`을 등록합니다.

프로덕션 빌드:

```bash
npm run build && npm start
```

## 화면 흐름

```
/login  ── 구글로 로그인 ──▶  /  (업무 페이지: 글 목록 + 에디터)
                                 │
                 '/page' 입력 ──▶ 새 글 생성 → 목록에 추가 · 에디터 열림
                                 │
                 글 클릭 ───────▶ 상세 편집(제목·이모지·커버·본문) · 자동 저장
                                 │                         └ 삭제(확인) → 목록으로
                                 │
                 아바타 클릭 ───▶ /mypage (별명 · 프로필 이미지)
```

- **로그인** (`/login`) — 구글 로그인 버튼 하나(**실제 Google OAuth 2.0 / Supabase Auth**).
  로그인해야 업무/마이 페이지 접근 가능. 로그아웃은 오른쪽 상단 헤더.
- **업무 페이지** (`/`) — 왼쪽 아이콘 레일 + 글 목록 + 에디터의 3분할. 목록에서 검색,
  `/page` 입력 후 Enter 또는 `＋ 새 글`로 생성.
- **글 상세** — 이모지·커버 선택, 제목/본문 편집, 입력 시 자동 저장, 삭제 확인 팝오버.
- **마이 페이지** (`/mypage`) — 별명 변경, 프로필 이미지 업로드.

## 구조

```
app/
  layout.tsx            루트 레이아웃 · Pretendard 로컬 폰트 · 전역 CSS
  globals.css           Nook 디자인 토큰(색·타이포·간격) + 리셋
  login/page.tsx        로그인 화면(구글 OAuth 시작)
  auth/callback/route.ts  구글 OAuth 콜백(인가 코드→세션 교환)
  (app)/
    layout.tsx          인증 가드 + 아이콘 레일 + 상태 Provider
    page.tsx            업무 페이지(목록 + 에디터/빈 상태)
    mypage/page.tsx     마이 페이지
middleware.ts           세션 갱신 + 라우트 가드
components/
  IconRail.tsx  PostList.tsx  Editor.tsx  EmptyState.tsx  icons.tsx  LogoutButton.tsx
lib/
  data.ts               타입 · 시드 데이터 · 시간 표기 헬퍼
  store.tsx             글/프로필 상태 Context (localStorage 영속)
  auth.ts               구글 OAuth 로그인/로그아웃 (Supabase Auth)
  supabase/client.ts    브라우저 Supabase 클라이언트
  supabase/server.ts    서버 Supabase 클라이언트(콜백·미들웨어용)
app/fonts/PretendardVariable.woff2   브랜드 서체(로컬 번들)
```

## 인증 (Supabase + Google OAuth 2.0)

로그인은 **Supabase Auth + Google OAuth 2.0**으로 실제 동작합니다. 흐름:

1. `/login`의 `구글로 로그인` → `supabase.auth.signInWithOAuth('google')`
2. 구글 동의 → `/auth/callback`에서 인가 코드를 세션으로 교환(PKCE)
3. 세션 쿠키 발급(`@supabase/ssr`) → `/`(업무 페이지)

세션은 쿠키에 저장되어 서버(미들웨어·콜백)와 클라이언트가 공유합니다. `middleware.ts`가
미로그인 접근을 `/login`으로, 로그인 상태의 `/login` 접근을 `/`로 리다이렉트합니다.
프로필(이름·이메일·사진)은 구글 계정 정보로 시드됩니다.

## 데이터 저장

글과 프로필(편집분)은 아직 브라우저 **localStorage**(`mini-nook-v1`)에 저장됩니다.
Supabase에는 인증 대상 테이블(`page`, `profile`)이 준비돼 있으며, 글 데이터를 DB로
옮기는 것은 다음 단계입니다. (`lib/store.tsx`의 localStorage 영속 로직을 유저별 DB 호출로 교체)

---

디자인 출처: Claude Design — **"Notion 페이지 디자인 계획"** (Nook 디자인 시스템 ·
`미니노션 와이어프레임` · `미니 노션` 프로토타입).
