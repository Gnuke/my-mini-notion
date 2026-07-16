# Research: 다크 모드 (002-dark-mode)

**Date**: 2026-07-16 | **Plan**: [plan.md](./plan.md)

Technical Context에 NEEDS CLARIFICATION은 없으며, 아래는 구현 방식 선정과
다크 팔레트 이식에 대한 결정 기록이다.

## R1. 테마 적용 메커니즘

- **Decision**: `<html>`에 `data-theme="dark" | "light"` 속성을 두고,
  `app/globals.css`에 `html[data-theme="dark"] { --토큰: 값; }` 오버라이드
  블록을 추가한다. 컴포넌트는 수정하지 않는다(이미 전부 `var(--토큰)` 참조).
- **Rationale**: Nook의 모든 색은 globals.css `:root` 토큰(100개)을 인라인
  스타일에서 참조한다. 속성 스왑 한 번으로 전 화면이 단일 리페인트로 전환되어
  SC-002(1초 이내)를 자동 충족하고, 컴포넌트 리팩터링이 0이라 헌법 IV(YAGNI)에
  부합한다.
- **Alternatives considered**:
  - `@media (prefers-color-scheme)` — 기각. FR-004가 "OS 설정 무시, 기본
    다크"를 요구하므로 미디어쿼리로는 표현 불가.
  - React 테마 컨텍스트/CSS-in-JS — 기각. 전 컴포넌트에 테마 값을 주입하는
    구조 변경이 필요하고 이득이 없다.
  - 클래스(`class="dark"`) — 동작 동일하나, 값이 열거형(dark/light)이므로
    `data-*` 속성이 상태 표현에 더 명확. 기능 차이는 없음.

## R2. 기본 다크 + FOUC(깜빡임) 방지

- **Decision**: `app/layout.tsx`의 `<html>`에 `data-theme="dark"`를
  서버 렌더 기본값으로 박아 두고, `<head>`에 동기(inline) 스크립트를 넣어
  localStorage `nook-theme`가 `"light"`일 때만 페인트 전에 속성을 `light`로
  바꾼다. `<html>`에 `suppressHydrationWarning`을 지정한다(스크립트가
  하이드레이션 전에 속성을 바꿀 수 있으므로).

  ```html
  <script>
    try {
      if (localStorage.getItem("nook-theme") === "light")
        document.documentElement.setAttribute("data-theme", "light");
    } catch (e) {}
  </script>
  ```

- **Rationale**: SSR HTML 자체가 다크이므로 첫 방문(저장값 없음)은 스크립트
  실행 여부와 무관하게 다크로 그려진다(SC-001). 라이트 저장 사용자만 페인트
  전 동기 스크립트로 전환되므로 어느 경우에도 반대 모드 플래시가 없다(SC-004).
  `"light"` 외 모든 값(손상·미지정)은 무시되어 다크 폴백이 성립한다(FR-006).
- **Alternatives considered**:
  - `useEffect`에서 적용 — 기각. 라이트 저장 사용자에게 다크 → 라이트 플래시
    발생(SC-004 위반).
  - 쿠키 + SSR 분기 — 기각. 서버 상태 도입은 로컬 프로토타입 범위를 벗어나는
    복잡성(헌법 IV). 기존 인증도 localStorage 패턴이다.
  - `next-themes` 라이브러리 — 기각. 신규 의존성 없이 동일 결과를 수십 줄로
    구현 가능.

## R3. 상태 보관 위치와 API

- **Decision**: 신규 모듈 `lib/theme.ts`에 테마 로직을 격리한다.
  - `type Theme = "dark" | "light"`, `THEME_KEY = "nook-theme"`,
    `DEFAULT_THEME = "dark"`
  - `getInitialTheme(): Theme` — localStorage 읽기, `"light"`만 인정, 그 외
    전부 `"dark"` (FR-004, FR-006)
  - `applyTheme(t: Theme)` — `document.documentElement` 속성 설정 +
    localStorage 저장 (FR-005)
  - `useTheme(): { theme, toggle }` — React 훅. PostList 토글 버튼이 사용
  - `THEME_INIT_SCRIPT` — R2 인라인 스크립트 문자열 (layout.tsx에서 주입)
- **Rationale**: `NookStore`(lib/store.tsx)는 글·프로필 데이터 저장소이고
  `NookProvider`는 `(app)` 레이아웃 안에만 존재한다. 테마는 로그인 화면에도
  적용되어야 하므로(FR-007) 스토어 밖의 독립 모듈이 맞다. localStorage 접근
  시 try/catch 폴백은 기존 `lib/auth.ts` 패턴을 따른다.
- **Alternatives considered**:
  - NookStore에 theme 추가 — 기각. Provider 밖(로그인)에서 못 쓰고, 데이터
    스토어에 UI 상태를 섞는다.
  - React Context 신설 — 기각. 소비자가 PostList 하나뿐이라 훅으로 충분
    (헌법 IV).

## R4. 다크 팔레트 — Notion 다크 모드 이식 값

- **Decision**: Notion 다크 모드(콘텐츠 `#191919`, 사이드바 `#202020`,
  본문 텍스트 `#d4d4d4` 계열, 구분선 `#2f2f2f` 계열, 링크 `#529cca`)를
  레퍼런스로 삼아 Nook의 웜 그레이 톤으로 미세 조정해 이식한다. 라이트의
  좌→우 밝기 구배(레일 `#f5f5f3` < 목록 `#fbfbfa` < 에디터 `#ffffff`)를
  다크에서는 역방향(레일 `#252525` > 목록 `#202020` > 에디터 `#191919`)으로
  유지한다 — Notion 다크와 동일한 위계다. 오버라이드는 **시맨틱 토큰만**
  대상으로 하고 프리미티브 램프(`--gray-*` 등)는 건드리지 않는다.

  확정 제안 값 (구현 시 `DESIGN.md`에 그대로 기록):

  | 시맨틱 토큰 | 라이트 (현행) | 다크 (신규) |
  | --- | --- | --- |
  | `--text-primary` | `var(--gray-1000)` `#1f1e1b` | `#d6d5d1` |
  | `--text-secondary` | `var(--gray-700)` `#57564f` | `#a5a49d` |
  | `--text-tertiary` | `var(--gray-500)` `#8f8f88` | `#83837c` |
  | `--text-disabled` | `var(--gray-400)` `#b6b6b0` | `#5f5e58` |
  | `--text-link` | `#3a7bd0` | `#529cca` |
  | `--text-accent` | `var(--blue-600)` `#2570cb` | `#7fb4ec` |
  | `--text-danger` | `var(--red-600)` `#b8382f` | `#eb6e63` |
  | `--text-success` | `var(--green-600)` `#278052` | `#4dab77` |
  | `--surface-base` | `var(--gray-0)` `#ffffff` | `#191919` |
  | `--surface-canvas` | `var(--gray-25)` `#fbfbfa` | `#202020` |
  | `--surface-subtle` | `var(--gray-50)` `#f7f7f5` | `#262625` |
  | `--surface-hover` | `var(--gray-100)` `#efefed` | `#2c2c2b` |
  | `--surface-active` | `var(--gray-150)` `#e9e9e7` | `#373735` |
  | `--surface-sidebar` | `#f5f5f3` | `#252524` |
  | `--surface-inverse` | `var(--gray-1000)` `#1f1e1b` | `#efefed` |
  | `--border-subtle` | `var(--gray-150)` `#e9e9e7` | `#2f2f2e` |
  | `--border-default` | `var(--gray-200)` `#e0e0dd` | `#3a3a38` |
  | `--border-strong` | `var(--gray-300)` `#d3d3ce` | `#474743` |
  | `--tile-blue` | `#eaf2fb` | `#243247` |

  유지(오버라이드 없음): `--accent`/`--accent-hover`/`--accent-active`
  (블루 버튼은 흰 글자와의 대비가 배경과 무관), `--border-focus`,
  `--focus-ring`, `--text-on-accent`, 그림자 토큰, 모션·타이포·radius 토큰,
  커버 팔레트(`COVERS` — 콘텐츠 색으로 간주, 다크에서도 파스텔 밴드 유지),
  이모지·구글 브랜드 색.

- **Rationale**: 사용자가 명확화에서 Notion 다크 모드 레퍼런스를 승인했다.
  시맨틱만 바꾸면 오버라이드가 19개로 최소화되고, 프리미티브 램프의 의미
  (`gray-0`=순백)가 보존되어 추론 가능성이 유지된다. 본문 텍스트
  `#d6d5d1`/`#191919` 대비는 약 12:1로 WCAG AA(FR-009, SC-005)를 충족한다.
- **Alternatives considered**:
  - 프리미티브 램프 반전(gray-0 ↔ gray-1000) — 기각. 스케일 역전의 연쇄
    효과(보더·스크롤바·인라인 참조)를 전수 검증해야 하고 결과 톤 제어가 어렵다.
  - Notion 값 그대로 복사 — 기각. Nook 웜 그레이 톤과 어긋나는 순수 회색이
    섞여 "ink & paper" 디자인 언어가 깨진다. 구배·위계만 가져오고 값은 웜
    톤으로 조정한다.

## R5. 토큰을 경유하지 않는 직접 리터럴의 다크 대응

DESIGN.md 대조로 발견한, 다크에서 시각적으로 깨지는 직접 참조 4종과 처리:

- **Decision**:
  1. `rgba(255,255,255,.92)` (Editor 커버 버튼 2곳 + 글자 수 배지 1곳) →
     신규 시맨틱 토큰 `--surface-overlay` (라이트: `rgba(255,255,255,0.92)`,
     다크: `rgba(25,25,25,0.85)`)로 치환.
  2. `var(--blue-700)` 아바타 이니셜 글자색 (IconRail·Editor 메타·마이페이지,
     3곳) → 신규 토큰 `--tile-blue-text` (라이트: `var(--blue-700)`, 다크:
     `#7fb4ec`)로 치환. 다크의 `--tile-blue` `#243247` 위에서 `--blue-700`은
     대비 약 1.9:1로 판독 불가이기 때문.
  3. `var(--red-50)` 에디터 삭제 버튼 hover 배경 (1곳) → 신규 토큰
     `--danger-subtle` (라이트: `var(--red-50)`, 다크: `#3d2422`)로 치환.
  4. 스크롤바 thumb `var(--gray-200)`/`var(--gray-300)` (globals.css) →
     컴포넌트 아닌 전역 CSS이므로 `html[data-theme="dark"]
     ::-webkit-scrollbar-thumb { background: #3a3a38 }` (+hover `#474743`)
     규칙 추가로 처리. thumb의 `border: 2px solid var(--surface-canvas)`는
     토큰 경유라 자동 적용.
- **Rationale**: 신규 토큰 3개 + CSS 규칙 1개가 다크에서 깨지는 지점 전부를
  덮는 최소 집합이다(헌법 IV). 팝오버 배경(`--surface-base` 경유), 삭제 확정
  버튼(`--red-500` — 다크 위 흰 글자 대비 충분) 등 나머지 리터럴 사용처는
  다크에서도 성립함을 DESIGN.md §4 전수 대조로 확인했다.
- **Alternatives considered**:
  - 다크 블록에서 프리미티브(`--red-50`, `--blue-700` 등) 재정의 — 기각.
    "프리미티브는 불변 팔레트"라는 토큰 체계의 전제가 깨지고, 같은
    프리미티브를 쓰는 다른 사용처에 의도치 않은 파급이 간다.

## R6. 토글 버튼 UI

- **Decision**: PostList 헤더(`내 글` ↔ `＋ 새 글` 사이 우측 그룹)에 28×28px
  아이콘 버튼을 추가한다. 다크일 때 `SunIcon`(라이트로 전환 의미), 라이트일
  때 `MoonIcon` 표시. `title`/`aria-label`은 상태에 따라 `"라이트 모드로
  전환"` / `"다크 모드로 전환"` (헌법 III). 스타일은 기존 RailButton 문법을
  따름: 배경 default `transparent` / hover `var(--surface-hover)`, 아이콘 색
  `var(--text-tertiary)`, `border-radius: var(--radius-sm)`, `transition:
  background var(--duration-fast) var(--ease-standard)`. `SunIcon`/`MoonIcon`은
  `components/icons.tsx`에 Lucide 스타일(공통 속성 동일, 16px)로 추가한다.
- **Rationale**: 명확화에서 "패널 상단 헤더" 확정. 헤더 우측에 이미 액션
  버튼(`＋ 새 글`)이 있어 그 왼쪽에 아이콘 버튼을 붙이는 것이 기존 레이아웃
  (양끝 정렬) 변경을 최소화한다. 아이콘·상태 표시는 FR-008 충족.
- **Alternatives considered**:
  - 텍스트 라벨 버튼("다크"/"라이트") — 기각. 256px 패널 헤더에 텍스트 버튼
    2개는 비좁고, 아이콘+툴팁이 Notion 관례에 가깝다.
  - 스위치(switch) 컴포넌트 — 기각. 신규 컴포넌트 제작 비용 대비 이득 없음
    (헌법 IV).

## R7. 브라우저 themeColor 메타

- **Decision**: `app/layout.tsx`의 `viewport.themeColor`를 `#fbfbfa` →
  `#191919`(다크 `--surface-base`)로 변경한다. 모드 전환 시 동적 갱신은 하지
  않는다.
- **Rationale**: 기본 모드가 다크이므로 첫인상(SC-001)과 브라우저 크롬 색이
  일치해야 한다. 동적 갱신은 라이트 사용자 브라우저 크롬 색이 어긋나는 사소한
  비용이 있으나, 메타 동적 조작 코드를 추가할 가치가 없다(헌법 IV). 필요 시
  후속 기능으로 분리한다.
- **Alternatives considered**: 테마별 동적 themeColor — 기각(위 근거).

## R8. 테스트 전략 (헌법 I 적용 방식)

- **Decision**: 동작은 Vitest + RTL로 TDD, 시각 값은 문서 대조 + 수동 검증.
  - `lib/theme.test.ts` — 저장값 없음/`"dark"`/`"light"`/손상값 각각에 대한
    `getInitialTheme` 결과(FR-004·006), `applyTheme`의 DOM 속성·localStorage
    반영(FR-005), localStorage 예외 시 폴백.
  - `components/PostList.test.tsx` — 헤더에 토글 버튼 렌더(FR-002), 클릭 시
    `document.documentElement`의 `data-theme` 반전 + 저장(FR-002·003·005),
    상태별 한국어 `aria-label` 전환(FR-008), 재클릭 원복.
  - CSS 토큰 값·FOUC 스크립트의 실제 페인트 타이밍은 jsdom으로 검증 불가 —
    quickstart.md의 수동 시나리오(SC-001~005)로 검증하고, 토큰 값은
    DESIGN.md 표와 globals.css의 문자 그대로 대조로 확인한다.
- **Rationale**: jsdom은 외부 스타일시트를 로드하지 않으므로 CSS 변수 해석
  테스트는 허위 신뢰를 만든다(헌법 I 모킹 규칙 — 실제 동작 검증 원칙).
  동작 계층(속성·저장·라벨)이 테스트 가능한 전부이며 FR 전 항목을 덮는다.
