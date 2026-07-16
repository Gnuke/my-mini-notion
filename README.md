# Nook — 미니 노션 (Mini Notion)

개인 업무를 기록하는 나만의 작은 공간. Claude Design 프로젝트 **"Nook"** 디자인 시스템과
와이어프레임을 그대로 옮겨, **로그인 · 글 목록 · 글 상세 편집 · 마이 페이지**를
하나의 Next.js 서비스로 결합했습니다.

## 실행

```bash
npm install
cp .env.example .env.local   # Supabase URL·anon key 입력 (대시보드 → Settings → API)
npm run dev      # http://localhost:3000
```

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
                 글 클릭 ───────▶ 상세 편집(제목·본문) · 자동 저장(서버)
                                 │                         └ 삭제(확인) → 목록으로
                                 │
                 아바타 클릭 ───▶ /mypage (별명 · 프로필 이미지)
```

- **로그인** (`/login`) — 구글 로그인 버튼 하나. 로그인해야 업무/마이 페이지 접근 가능.
- **업무 페이지** (`/`) — 왼쪽 아이콘 레일 + 글 목록 + 에디터의 3분할. 목록에서 검색,
  `/page` 입력 후 Enter 또는 `＋ 새 글`로 생성.
- **글 상세** — 제목/본문 편집, 입력을 멈추면 서버에 자동 저장(성공 시 `저장됨 ✓`),
  삭제 확인 팝오버.
- **마이 페이지** (`/mypage`) — 별명 변경, 프로필 이미지 업로드.

## 구조

```
app/
  layout.tsx            루트 레이아웃 · Pretendard 로컬 폰트 · 전역 CSS
  globals.css           Nook 디자인 토큰(색·타이포·간격) + 리셋
  login/page.tsx        로그인 화면
  (app)/
    layout.tsx          인증 가드 + 아이콘 레일 + 상태 Provider
    page.tsx            업무 페이지(목록 + 에디터/빈 상태)
    mypage/page.tsx     마이 페이지
components/
  IconRail.tsx  PostList.tsx  Editor.tsx  EmptyState.tsx  icons.tsx
lib/
  data.ts               타입 · 시간 표기 헬퍼
  pages.ts              page 테이블 CRUD + row↔Post 매핑
  store.tsx             글/프로필 상태 Context (글: Supabase, 프로필: localStorage)
  supabase/client.ts    Supabase 브라우저 클라이언트 (@supabase/ssr)
  auth.ts               로그인 상태 (모의)
supabase/migrations/    page 테이블 RLS 정책 마이그레이션
app/fonts/PretendardVariable.woff2   브랜드 서체(로컬 번들)
```

## 데이터 저장

글은 **Supabase `page` 테이블**에 로그인한 계정(user_id) 기준으로 저장되어
새로고침·재로그인·다른 기기에서도 유지됩니다. RLS(행 수준 보안) 정책이 자신의 글만
조회·수정·삭제할 수 있도록 DB 수준에서 강제합니다
(`supabase/migrations/20260716_page_rls_policies.sql`). 프로필(별명·이미지)은 기존대로
브라우저 localStorage(`mini-nook-v1`)에 저장됩니다.

## 참고: 로그인은 모의(mock) 구현

PRD의 목표는 Google OAuth 2.0이지만, 실제 OAuth는 클라이언트 자격 증명과 콜백 서버가
필요해 자체 완결형 프로토타입에서는 바로 동작시킬 수 없습니다. 그래서 로그인 버튼은
인증 흐름을 **시뮬레이션**(localStorage 플래그)합니다. 글 저장은 이미 Supabase 세션
(`supabase.auth.getUser()`)을 전제로 동작하므로, 실제 구글 로그인(Supabase Auth) 기능이
합류하면 `lib/auth.ts`의 모의 가드만 교체하면 됩니다. 모의 로그인 상태에서는 Supabase
세션이 없어 글 목록이 비어 있는 것이 정상입니다.

---

디자인 출처: Claude Design — **"Notion 페이지 디자인 계획"** (Nook 디자인 시스템 ·
`미니노션 와이어프레임` · `미니 노션` 프로토타입).
