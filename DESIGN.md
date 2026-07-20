# Nook — DESIGN.md

> 이 문서는 구현된 코드에서 역추출한 디자인 명세입니다. 코드를 보지 않고도 이 문서만으로
> 동일한 UI를 재구현할 수 있도록, 모든 값을 리터럴 그대로 기록했습니다.
> 코드에서 확인되지 않는 항목은 "미구현" 또는 "미정"으로 표기했습니다.

---

## 1. 개요

- **제품명**: Nook — 미니 노션 (Mini Notion). 브라우저 탭 제목: `Nook — 나만의 작은 노션`
- **컨셉**: "개인 업무를 기록하는 나만의 작은 공간". 상용 노션의 복잡함을 덜어낸,
  로그인 → 글 목록 → 상세 편집 → 자동 저장 → 삭제의 최소 흐름만 담은 개인용 노트 도구.
- **디자인 언어**: Notion풍 플랫(flat) 스타일. 따뜻한 웜 그레이("ink & paper") 중립색 램프 +
  차분한 블루 액센트. 그림자와 모션은 절제, 보더는 얇고 옅게.
- **모드**: 다크/라이트 2모드. **기본은 다크 모드**(저장된 선택이 없으면 OS 설정과
  무관하게 다크). 다크 팔레트는 Notion 다크 모드를 레퍼런스로 웜 톤에 맞게 이식 ([§2.7](#27-다크-모드)).
  전환 토글은 글 목록 패널 헤더([§4.2](#42-postlist-componentspostlisttsx)), 선택은
  localStorage `nook-theme`에 저장.
- **디자인 출처**: Claude Design — "Notion 페이지 디자인 계획" (Nook 디자인 시스템 ·
  `미니노션 와이어프레임` · `미니 노션` 프로토타입). 참조 이미지 `03-reference-design.png`와
  구현이 다른 부분은 [§7](#7-참조-이미지와의-차이점)에 별도 정리 (**코드가 정답**).
- **언어**: UI 전체 한국어 (`<html lang="ko">`)

---

## 2. 디자인 토큰

단일 원천: `app/globals.css`. 라이트 값은 `:root` 블록(**커스텀 프로퍼티 총 103개**, 전수 기록),
다크 값은 `html[data-theme="dark"]` 블록의 시맨틱 재정의 22개 ([§2.7](#27-다크-모드)).
아래 표의 "사용처" 열에서 `미사용`은 토큰이 정의만 되어 있고 컴포넌트/전역 스타일 어디에서도
참조되지 않음을 뜻한다 (미래 확장용으로 유지).

### 2.1 색상 — 프리미티브 팔레트 (35개)

#### 중립색: 웜 그레이 "ink & paper" 램프 (14개)

| 토큰 | 값 | 비고 |
| --- | --- | --- |
| `--gray-0` | `#ffffff` | 순백 |
| `--gray-25` | `#fbfbfa` | 캔버스 (themeColor로도 사용) |
| `--gray-50` | `#f7f7f5` | |
| `--gray-100` | `#efefed` | |
| `--gray-150` | `#e9e9e7` | |
| `--gray-200` | `#e0e0dd` | 스크롤바 thumb |
| `--gray-300` | `#d3d3ce` | 스크롤바 thumb hover |
| `--gray-400` | `#b6b6b0` | |
| `--gray-500` | `#8f8f88` | |
| `--gray-600` | `#6b6b64` | 직접 사용처 없음 (시맨틱 미참조) |
| `--gray-700` | `#57564f` | |
| `--gray-800` | `#3c3b36` | 직접 사용처 없음 (시맨틱 미참조) |
| `--gray-900` | `#2b2a27` | 직접 사용처 없음 (시맨틱 미참조) |
| `--gray-1000` | `#1f1e1b` | |

#### 액센트: 차분한 블루 (7개)

| 토큰 | 값 | 비고 |
| --- | --- | --- |
| `--blue-50` | `#eaf2fb` | |
| `--blue-100` | `#d3e5f8` | 직접 사용처 없음 |
| `--blue-300` | `#7fb4ec` | 직접 사용처 없음 |
| `--blue-500` | `#2f7fe0` | 주 액센트 |
| `--blue-600` | `#2570cb` | |
| `--blue-700` | `#1f5eac` | 아바타 이니셜 글자색으로 직접 사용 |
| `--blue-link` | `#3a7bd0` | |

#### 시맨틱 휴 (muted, Notion-flat) (9개)

| 토큰 | 값 | 비고 |
| --- | --- | --- |
| `--green-50` | `#e8f3ec` | 직접 사용처 없음 |
| `--green-500` | `#2f9e63` | 직접 사용처 없음 |
| `--green-600` | `#278052` | |
| `--amber-50` | `#fbf1e3` | 직접 사용처 없음 |
| `--amber-500` | `#d98b2b` | 직접 사용처 없음 |
| `--amber-600` | `#b8721f` | 직접 사용처 없음 |
| `--red-50` | `#fbeceb` | 삭제 버튼 hover 배경으로 직접 사용 |
| `--red-500` | `#d6473d` | 삭제 확인 버튼 배경으로 직접 사용 |
| `--red-600` | `#b8382f` | |

#### 아이콘 타일 / 배지용 틴트 (5개)

| 토큰 | 값 | 사용처 |
| --- | --- | --- |
| `--tile-blue` | `#eaf2fb` | 아바타 배경, 목록 선택 행 배경, 명령 입력창 배경 |
| `--tile-green` | `#e8f3ec` | 미사용 |
| `--tile-amber` | `#fbf1e3` | 미사용 |
| `--tile-red` | `#fbeceb` | 미사용 |
| `--tile-gray` | `#f0f0ee` | 미사용 |

### 2.2 색상 — 시맨틱 별칭 (28개)

프리미티브 → 시맨틱 참조 관계를 그대로 기록.

#### 텍스트 (9개)

| 토큰 | 참조/값 | 사용처 |
| --- | --- | --- |
| `--text-primary` | `var(--gray-1000)` | 본문·제목 기본 글자색, body 기본색 |
| `--text-secondary` | `var(--gray-700)` | 보조 텍스트 (팝오버 본문, 라벨, 커버 버튼) |
| `--text-tertiary` | `var(--gray-500)` | 3차 텍스트 (메타, 설명, placeholder 색) |
| `--text-disabled` | `var(--gray-400)` | 미사용 |
| `--text-on-accent` | `#ffffff` | 미사용 (액센트 버튼들은 `#fff` 리터럴 사용) |
| `--text-link` | `var(--blue-link)` | `a` 기본색 |
| `--text-accent` | `var(--blue-600)` | 미사용 |
| `--text-danger` | `var(--red-600)` | 에디터 삭제 버튼 글자색 |
| `--text-success` | `var(--green-600)` | 마이 페이지 "저장되었습니다 ✓" |

#### 서피스 (7개)

| 토큰 | 참조/값 | 사용처 |
| --- | --- | --- |
| `--surface-base` | `var(--gray-0)` | body 배경, 에디터 영역, 카드, 팝오버 |
| `--surface-canvas` | `var(--gray-25)` | 로그인 배경, 글 목록 패널 배경, 스크롤바 트랙 보더 |
| `--surface-subtle` | `var(--gray-50)` | 로그인 버튼 hover, 비활성 입력 배경 |
| `--surface-hover` | `var(--gray-100)` | 레일 버튼·목록 행·이모지 버튼 hover |
| `--surface-active` | `var(--gray-150)` | 레일 버튼 active(현재 페이지) 배경 |
| `--surface-sidebar` | `#f5f5f3` | 아이콘 레일 배경 |
| `--surface-inverse` | `var(--gray-1000)` | 미사용 |

#### 보더 (4개)

| 토큰 | 참조/값 | 사용처 |
| --- | --- | --- |
| `--border-subtle` | `var(--gray-150)` | 패널 구분선, 팝오버 보더, 명령 입력창 보더 |
| `--border-default` | `var(--gray-200)` | 미사용 |
| `--border-strong` | `var(--gray-300)` | 텍스트 입력 보더, 취소 버튼 보더, 카메라 배지 보더 |
| `--border-focus` | `var(--blue-500)` | `.nk-inp:focus` 보더 |

#### 액센트 (4개) + 포커스 링 (1개)

| 토큰 | 참조/값 | 사용처 |
| --- | --- | --- |
| `--accent` | `var(--blue-500)` | 주요 버튼 배경, 로고 타일, 선택 행 좌측 바, 아바타 선택 링 |
| `--accent-hover` | `var(--blue-600)` | 주요 버튼 hover, `a:hover` |
| `--accent-active` | `var(--blue-700)` | 미사용 |
| `--accent-subtle` | `var(--blue-50)` | 미사용 |
| `--focus-ring` | `rgba(47, 127, 224, 0.35)` | `.nk-inp:focus` 3px 링 |

#### 오버레이·테마 틴트 (3개 — 다크 모드 대응으로 신설, 002-dark-mode)

직접 리터럴/프리미티브 참조 중 다크에서 값이 달라져야 하는 지점을 토큰화한 것.

| 토큰 | 라이트 값 | 사용처 |
| --- | --- | --- |
| `--surface-overlay` | `rgba(255, 255, 255, 0.92)` | 커버 버튼 2종·글자 수 배지 배경 (Editor) |
| `--tile-blue-text` | `var(--blue-700)` | 아바타 이니셜 글자색 (IconRail·Editor 메타·마이 페이지) |
| `--danger-subtle` | `var(--red-50)` | 에디터 삭제 버튼 hover 배경 |

### 2.3 타이포그래피 (21개 토큰)

#### 폰트 패밀리 (2개)

| 토큰 | 값 |
| --- | --- |
| `--font-sans` | `var(--font-pretendard), -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "Segoe UI", Roboto, sans-serif` |
| `--font-mono` | `ui-monospace, "SF Mono", Menlo, Consolas, monospace` (명령 입력창에 사용) |

**Pretendard 로딩 방식** (`app/layout.tsx`): `next/font/local`로 로컬 번들
`./fonts/PretendardVariable.woff2`를 로드. 옵션: `variable: "--font-pretendard"`,
`display: "swap"`, `weight: "45 920"` (가변 폰트 범위). `<html>` 요소에 변수 클래스 적용.
`--font-pretendard` 커스텀 프로퍼티 자체는 globals.css가 아닌 next/font가 주입한다.

#### 크기 스케일 (9개)

| 토큰 | 값 |
| --- | --- |
| `--text-xs` | `11px` |
| `--text-sm` | `12px` |
| `--text-base` | `13px` |
| `--text-md` | `14px` |
| `--text-lg` | `16px` |
| `--text-xl` | `20px` |
| `--text-2xl` | `24px` |
| `--text-3xl` | `30px` |
| `--text-4xl` | `40px` |

> **주의**: 컴포넌트들은 이 크기 토큰을 참조하지 않고 `px` 리터럴을 인라인으로 사용한다
> (예: 목록 제목 `14px`, 에디터 제목 `36px` — `36px`는 스케일에 없는 값이다).
> 스케일 토큰은 정의만 존재. 재구현 시 각 컴포넌트 명세의 리터럴 값을 따를 것.

#### 굵기 (4개) / 행간 (4개) / 자간 (2개)

| 토큰 | 값 | | 토큰 | 값 | | 토큰 | 값 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `--weight-normal` | `400` | | `--leading-tight` | `1.2` | | `--tracking-tight` | `-0.02em` |
| `--weight-medium` | `500` | | `--leading-snug` | `1.35` | | `--tracking-snug` | `-0.01em` |
| `--weight-semibold` | `600` | | `--leading-normal` | `1.5` | | | |
| `--weight-bold` | `700` | | `--leading-relaxed` | `1.65` | | | |

> 굵기·행간 토큰도 컴포넌트에서는 숫자 리터럴로 사용된다. `--tracking-tight`만
> 큰 제목들(로그인 h1, 에디터 제목, 마이 페이지 제목)에서 `var()`로 실제 참조된다.
> `--tracking-snug`는 미사용.

전역 텍스트 렌더링: `body { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }`

### 2.4 간격 · 크기 · radius · 그림자 (14개 토큰 + 하드코딩 치수)

#### Radius (6개)

| 토큰 | 값 | 사용처 |
| --- | --- | --- |
| `--radius-xs` | `3px` | 미사용 |
| `--radius-sm` | `4px` | 입력창, 소형 버튼, 커버 버튼·스와치 |
| `--radius-md` | `6px` | 레일 버튼, 목록 행, 이모지 피커 버튼 |
| `--radius-lg` | `8px` | 팝오버, 로그인 버튼·로고, 커버 피커 |
| `--radius-xl` | `12px` | 로그인 카드 |
| `--radius-pill` | `999px` | 미사용 (원형은 `50%` 리터럴 사용) |

#### 그림자 (6개)

| 토큰 | 값 | 사용처 |
| --- | --- | --- |
| `--shadow-xs` | `0 1px 2px rgba(15, 15, 15, 0.05)` | 미사용 |
| `--shadow-sm` | `0 1px 3px rgba(15, 15, 15, 0.08), 0 1px 2px rgba(15, 15, 15, 0.04)` | 로그인 카드 |
| `--shadow-md` | `0 3px 8px rgba(15, 15, 15, 0.09), 0 1px 3px rgba(15, 15, 15, 0.05)` | 미사용 |
| `--shadow-lg` | `0 8px 24px rgba(15, 15, 15, 0.12), 0 2px 6px rgba(15, 15, 15, 0.06)` | 팝오버 3종 (삭제 확인·이모지·커버) |
| `--shadow-popover` | `0 0 0 1px rgba(15, 15, 15, 0.05), 0 6px 20px rgba(15, 15, 15, 0.16)` | 미사용 (팝오버들은 `--shadow-lg` 사용) |
| `--shadow-focus` | `0 0 0 3px var(--focus-ring)` | 미사용 (`.nk-inp:focus`는 동일 값을 리터럴로 기술) |

#### 레이아웃 치수 토큰 (2개)

| 토큰 | 값 | 비고 |
| --- | --- | --- |
| `--sidebar-width` | `260px` | **미사용** — 실제 글 목록 패널은 `256px` 하드코딩 |
| `--content-max` | `720px` | **미사용** — 에디터 본문 폭 `720px`은 하드코딩 (값은 일치) |

#### Spacing 스케일

전용 spacing 토큰은 **정의되어 있지 않다**. 모든 간격은 컴포넌트 인라인 스타일의 px 리터럴
(주요 값: 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 22, 24, 26, 30, 32, 34, 40, 48, 56px).
개별 값은 [§4 컴포넌트 명세](#4-컴포넌트-명세)에 기록.

#### z-index

토큰 없음. 리터럴 2단계만 존재: 팝오버 백드롭 `z-index: 10`, 팝오버 본체 `z-index: 20`.

### 2.5 모션 (5개 토큰)

| 토큰 | 값 | 사용처 |
| --- | --- | --- |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0.2, 1)` | 모든 버튼 배경 전환 |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | 미사용 |
| `--duration-fast` | `90ms` | 레일 버튼, 액센트 버튼(새 글·저장·빈 상태) |
| `--duration-base` | `140ms` | 로그인 버튼 |
| `--duration-slow` | `220ms` | 미사용 |

- 전환 대상은 전부 `background` 단일 속성 (`transition: background var(--duration-*) var(--ease-standard)`).
- 입력창(`.nk-inp` 부착 요소)은 별도로 `transition: box-shadow .15s, border-color .15s` (리터럴, 이징 미지정 = 브라우저 기본).
- 접근성: `@media (prefers-reduced-motion: reduce)`에서 모든 요소
  `transition-duration: 0.001ms !important; animation-duration: 0.001ms !important;`
- 애니메이션(keyframes)은 없음. 팝오버 등장/퇴장 애니메이션 미구현.

### 2.6 전역 스타일 (globals.css 나머지)

- **리셋**: `* { box-sizing: border-box }`, `html, body { margin: 0; padding: 0; height: 100% }`
- **body**: `background: var(--surface-base); color: var(--text-primary); font-family: var(--font-sans)`
- **링크**: `a { color: var(--text-link); text-decoration: none }`, `a:hover { color: var(--accent-hover) }`
- **버튼**: `button { font-family: inherit }`
- **스크롤바** (WebKit): 폭/높이 `10px`; thumb `background: var(--gray-200); border-radius: 6px; border: 2px solid var(--surface-canvas)`; thumb hover `var(--gray-300)`.
  다크 모드에서는 thumb `#3a3a38` / hover `#474743`로 재정의 (`html[data-theme="dark"]` 규칙, §2.7) — thumb 보더는 `--surface-canvas` 경유라 자동 적용
- **placeholder**: `input::placeholder, textarea::placeholder { color: var(--text-tertiary) }`
- **포커스**: `input:focus, textarea:focus { outline: none }` (기본 아웃라인 제거).
  대신 `.nk-inp` 클래스가 붙은 입력만
  `.nk-inp:focus { border-color: var(--border-focus) !important; box-shadow: 0 0 0 3px var(--focus-ring) }`
- **뷰포트 메타** (`layout.tsx`): `width=device-width, initialScale 1, themeColor #191919`
  (기본 다크 기준 고정 — 모드 전환 시 동적 갱신 없음)
- **테마 부트스트랩** (`layout.tsx`): `<html lang="ko" data-theme="dark" suppressHydrationWarning>`
  이 SSR 기본값. `<body>` 최상단 인라인 스크립트(`lib/theme.ts`의 `THEME_INIT_SCRIPT`)가
  localStorage `nook-theme` === `"light"`일 때만 페인트 전에 속성을 `light`로 전환
  (그 외 값·부재·예외는 전부 다크 유지 → 반대 모드 플래시 없음)

### 2.7 다크 모드

**메커니즘**: `<html data-theme="dark">`일 때 `html[data-theme="dark"]` 블록이
**시맨틱 토큰만** 재정의한다(총 22개). 프리미티브 램프(§2.1)는 불변. 컴포넌트는
전부 토큰을 경유하므로 속성 스왑 한 번으로 전 화면이 전환된다.
팔레트는 Notion 다크 모드(콘텐츠 `#191919` 위계)를 웜 그레이 톤으로 조정해 이식.
좌→우 밝기 위계는 라이트의 역방향: 레일 `#252524` > 목록 `#202020` > 에디터 `#191919`.

| 시맨틱 토큰 | 라이트 (기본) | 다크 |
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
| `--surface-overlay` | `rgba(255, 255, 255, 0.92)` | `rgba(25, 25, 25, 0.85)` |
| `--tile-blue-text` | `var(--blue-700)` `#1f5eac` | `#7fb4ec` |
| `--danger-subtle` | `var(--red-50)` `#fbeceb` | `#3d2422` |

**다크에서도 유지(재정의 없음)**: `--accent`/`--accent-hover`/`--accent-active`
(블루 버튼은 흰 글자 대비가 배경과 무관), `--border-focus`, `--focus-ring`,
`--text-on-accent`, 그림자·모션·타이포·radius 토큰, 커버 팔레트(`COVERS` —
콘텐츠 색으로 간주해 다크에서도 파스텔 유지), 이모지·구글 브랜드 색.

**저장/전환 규칙** (`lib/theme.ts`): 저장 키 `nook-theme`, 값 `"dark" | "light"`.
읽기는 정확히 `"light"`일 때만 라이트, 그 외 전부(부재·무효·예외) 다크 폴백.
쓰기는 토글 클릭 시에만. 로그인 화면은 현재 모드를 표시만 하며 전환 수단 없음.

---

## 3. 레이아웃

### 3.1 로그인 (`/login`)

```
┌────────────────────────────────────────┐
│         (surface-canvas 전면 배경)        │
│            ┌──────────────┐            │
│            │  [N] 로고 44px │            │  카드: width 380 (max-width 100%)
│            │     Nook      │            │  padding 48px 40px 40px
│            │  설명 2줄       │            │  가운데 정렬 (flex center)
│            │ [구글로 로그인]  │            │  화면: min-height 100vh, padding 24
│            │  안내 문구      │            │
│            └──────────────┘            │
└────────────────────────────────────────┘
```

- 화면: `min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--surface-canvas); padding: 24px`
- 카드: `width: 380px; max-width: 100%; background: var(--surface-base); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); box-shadow: var(--shadow-sm); padding: 48px 40px 40px;` 내부 컬럼 가운데 정렬, `text-align: center`

### 3.2 업무 페이지 (`/`) — 3분할

```
┌──────────────────────────────────────────┐
│         전역 헤더 44px          [로그아웃] │
├──┬─────────┬─────────────────────────┤
│레 │  글 목록  │       에디터 / 빈 상태      │
│일 │  256px  │       flex: 1            │
│60│ (canvas)│     (surface-base)       │
└──┴─────────┴─────────────────────────┘
```

- 앱 셸(`(app)/layout.tsx`): `height: 100vh; display: flex; flex-direction: column; background: var(--surface-base); color: var(--text-primary); overflow: hidden` — **전역 헤더(44px, 전체 폭) → 콘텐츠 행** 순으로 쌓인다.
- 전역 헤더: `height: 44px; flex: none; display: flex; align-items: center; justify-content: flex-end; padding: 0 16px; border-bottom: 1px solid var(--border-subtle); background: var(--surface-base)` — 우측에 로그아웃 버튼(§4.8). 모든 앱 화면(`/`·`/mypage`·빈 상태)에서 항상 표시.
- 콘텐츠 행: `flex: 1; min-width: 0; display: flex; overflow: hidden` — 셸은 컨테이너만 제공하고, 아이콘 레일은 각 페이지가 이 행 안에 직접 렌더한다
  (업무 페이지: 접기 토글 프롭 전달, 마이 페이지: 프롭 없이 렌더 — 002-sidebar-collapse에서 접기 상태를 페이지가 소유하기 위한 구조)
- 인증 확인 전: 내용 없는 `<div style="height: 100vh; background: var(--surface-canvas)">` (앱 플래시 방지, 헤더 없음)
- 서버 목록 로딩·조회 실패 동안(`page.tsx`): 3열은 빈
  `<div style="flex: 1; background: var(--surface-base)">` — 로딩·오류 안내는
  2열 글 목록 패널이 담당 (§4.2)
- 1열 아이콘 레일: `width: 60px; flex: none` — 스크롤 없음, 세로 flex
- 2열 글 목록: `width: 256px; flex: none` — 목록 영역만 `overflow-y: auto`
- 3열 에디터 영역: `flex: 1; min-width: 0; display: flex; flex-direction: column; overflow: hidden` —
  선택된 글이 있으면 Editor, 없으면 EmptyState
- 반응형 분기 없음 (고정 3분할, 미디어쿼리 미구현)

**사이드바 접힘 상태** (업무 페이지 전용):

```
┌──┬──────────────────────────────────┐
│스 │        에디터 / 빈 상태            │
│트 │        flex: 1                   │
│립 │      (surface-base)              │
│60│                                  │
└──┴──────────────────────────────────┘
```

- 토글 버튼([§4.1](#41-iconrail-componentsiconrailtsx))으로 1열 레일 내용과
  2열 글 목록이 함께 접힌다. 60px 스트립(토글 버튼만 남은 레일 컨테이너)과
  에디터 영역만 남는다.
- 글 목록(PostList)은 접힘 중에도 **마운트 유지** — 래퍼
  `<div style="display: collapsed ? none : contents">`로 표시만 숨겨 검색어
  등 로컬 상태를 보존한다.
- 접힘 상태는 `page.tsx`의 로컬 state(기본 펼침)이며 저장하지 않는다 —
  새로고침·재방문·마이 페이지 왕복 시 펼침으로 시작. 전환 모션 없음(즉시 전환).

### 3.3 글 상세 (에디터 — 3열 내부)

- 세로 구성: **탑바(높이 44px, flex: none)** → **스크롤 영역(flex: 1, overflow-y: auto)**
- 스크롤 영역 내부: 본문 컬럼 (커버 밴드는 002 기능에서 제거됨)
- 본문 컬럼: `max-width: 720px; margin: 0 auto; padding: 0 56px 140px`

### 3.4 마이 페이지 (`/mypage`)

- 3열 전체를 차지: `flex: 1; min-width: 0; background: var(--surface-base); overflow-y: auto`
  (글 목록 패널 없음 — 레일 + 콘텐츠 2분할)
- 내부 컬럼: `max-width: 520px; margin: 0 auto; padding: 56px 40px 100px`

---

## 4. 컴포넌트 명세

### 4.1 IconRail (`components/IconRail.tsx`)

앱 왼쪽 고정 세로 네비게이션. `<nav aria-label="주요 탐색">`.

- 프롭: `collapsed?: boolean`(기본 false), `onToggleSidebar?: () => void` —
  `onToggleSidebar`가 있을 때만 접기 토글 버튼을 렌더한다 (업무 페이지 전달,
  마이 페이지 미전달 → 마이 페이지엔 토글 없음)
- 컨테이너: `width: 60px; flex: none; background: var(--surface-sidebar); border-right: 1px solid var(--border-subtle); display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 0`
- 구성(위→아래): 접기 토글 버튼(프롭 있을 때) → 워크스페이스 타일 → 홈 버튼 → 새 글 버튼 → 스페이서(`flex: 1`) → 아바타 버튼

**접기 토글 버튼** (RailButton 재사용, 34×34px):

| 상태 | 아이콘 | title / aria-label |
| --- | --- | --- |
| 펼침(collapsed=false) | `PanelLeftCloseIcon` 19px | `사이드바 접기` |
| 접힘(collapsed=true) | `PanelLeftOpenIcon` 19px | `사이드바 펼치기` |

**접힘 스트립 모드** (`collapsed=true`): 같은 `<nav>` 컨테이너(60px)에 토글
버튼 **하나만** 렌더한다. 워크스페이스 타일·홈·새 글·아바타는 렌더하지 않음
(접근성 트리에서도 제거). 토글 버튼 위치는 펼침 상태와 동일(최상단).

**워크스페이스 타일** (클릭 불가, `title="{닉네임}의 워크스페이스"` — 닉네임 없으면 `나의 워크스페이스`):
`34×34px; border-radius: var(--radius-md); background: var(--accent); color: #fff; font-weight: 600; font-size: 15px; margin-bottom: 8px` — 내용은 닉네임 첫 글자
(닉네임 공백/없음이면 `?`).

**RailButton** (홈 · 새 글 공통, `34×34px`):

| 상태 | 배경 | 글자/아이콘 색 |
| --- | --- | --- |
| default | `transparent` | `var(--text-tertiary)` |
| hover | `var(--surface-hover)` | `var(--text-tertiary)` |
| active (현재 경로) | `var(--surface-active)` | `var(--text-primary)` |
| focus | 별도 스타일 미구현 (브라우저 기본) | |
| disabled | 미구현 | |

- `border: none; border-radius: var(--radius-md); cursor: pointer; transition: background var(--duration-fast) var(--ease-standard)`
- 홈 버튼: `HomeIcon` (19px), `title/aria-label="홈"`, active 조건 `pathname === "/"`, 클릭 → `/`
- 새 글 버튼: `PlusIcon` (19px), `title/aria-label="새 글"`, active 지정 없음, 클릭 → 새 글 생성 후 `/` 이동

**아바타 버튼** (`title/aria-label="마이 페이지"`):
- 외곽 버튼: `38×38px; border: none; background: transparent; border-radius: 50%; padding: 0`
  - `/mypage`에 있을 때: `box-shadow: 0 0 0 2px var(--accent)` (선택 링). 아니면 `none`
- 내부 아바타: `30×30px; border-radius: 50%; overflow: hidden; background: var(--tile-blue); color: var(--tile-blue-text); font-size: 12px; font-weight: 600` — 프로필 이미지 있으면 `<img>` `object-fit: cover`, 없으면 닉네임 첫 글자
- hover 스타일 미구현

### 4.2 PostList (`components/PostList.tsx`)

2열 글 목록 패널.

- 컨테이너: `width: 256px; flex: none; background: var(--surface-canvas); border-right: 1px solid var(--border-subtle); display: flex; flex-direction: column`

**헤더 행**: `padding: 15px 14px 11px`, 양끝 정렬. 우측은 flex 그룹
(`gap: 8px`) — 모드 전환 토글 + `＋ 새 글` 순서
- 타이틀 텍스트: `내 글` — `font-size: 15px; font-weight: 600`
- **모드 전환 토글 버튼** (002-dark-mode):
  `28×28px; border: none; border-radius: var(--radius-sm); color: var(--text-tertiary); transition: background var(--duration-fast) var(--ease-standard)`; 내용 가운데 정렬(flex)
  — default 배경 `transparent` / hover `var(--surface-hover)`(JS) / active·focus·disabled 미구현
  - 다크 모드일 때: `SunIcon`(16px), `title`/`aria-label="라이트 모드로 전환"`
  - 라이트 모드일 때: `MoonIcon`(16px), `title`/`aria-label="다크 모드로 전환"`
  - 클릭 → 모드 즉시 반전(새로고침 없음) + localStorage `nook-theme` 저장. 다른 부수효과 없음
- **`＋ 새 글` 버튼** (전각 ＋ 문자 포함 라벨):
  `height: 28px; padding: 0 11px; border: none; border-radius: var(--radius-sm); color: #fff; font-size: 13px; font-weight: 500; transition: background var(--duration-fast) var(--ease-standard)`
  — default `var(--accent)` / hover `var(--accent-hover)` / active·focus·disabled 미구현

**검색 입력** (wrapper `padding: 0 12px 8px`):
- `.nk-inp` 클래스. placeholder: `검색…`
- `width: 100%; border: 1px solid var(--border-strong); border-radius: var(--radius-sm); padding: 6px 10px; font-family: var(--font-sans); font-size: 13px; color: var(--text-primary); background: var(--surface-base); transition: box-shadow .15s, border-color .15s`
- focus: `.nk-inp:focus` 공통 링 (보더 `--border-focus` + `0 0 0 3px var(--focus-ring)`)
- 검색 규칙: 대소문자 무시, 제목(빈 제목은 `제목 없음`으로 간주) 또는 본문에 부분 일치

**명령 입력** (wrapper `padding: 0 12px 10px`):
- `.nk-inp` 클래스. placeholder: `'/page' 입력 후 Enter`
- `width: 100%; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 6px 10px; font-family: var(--font-mono); font-size: 12.5px; color: var(--text-secondary); background: var(--tile-blue); transition: box-shadow .15s, border-color .15s`
- 동작: Enter 시 입력값(trim + 소문자)이 `/page`, `/new`이거나 `/page `로 시작하면 새 글 생성 후 입력 비움. 그 외 입력은 무시(에러 상태 미구현)

**구분선**: `height: 1px; background: var(--border-subtle); margin: 2px 12px 8px`

**생성 실패 안내 (구분선 아래, 목록 영역 위)**: `newPost` 서버 등록이 실패하면
한 줄 안내를 표시 — `padding: 0 12px 8px; font-size: 12px; color: var(--text-danger)`,
문구 `새 글을 만들지 못했어요.` 다음 등록 성공 시 사라짐.

**목록 영역**: `flex: 1; overflow-y: auto; padding: 0 8px 14px`
- 정렬: `created`(생성 시각) 내림차순(최신 생성 순) 고정
- **로딩 상태**: 서버에서 목록을 불러오는 동안 빈 상태와 동일한 블록 스타일
  (`padding: 22px 12px; text-align: center; color: var(--text-tertiary);
  font-size: 13px; line-height: 1.6`)로 `불러오는 중…` 표시. 로딩 중에는
  행·빈 상태 문구를 렌더하지 않음
- **조회 실패 상태**: 같은 블록 스타일로 `글을 불러오지 못했어요.` +
  `다시 시도` 버튼(`＋ 새 글` 버튼과 동일 스타일: height 28px, padding 0 11px,
  radius sm, `--accent`/hover `--accent-hover`, #fff, 13px/500,
  `margin-top: 10px`). 클릭 시 재조회

**목록 항목 행** (이모지 없음 — 제목·메타 줄만):
- 공통: `display: flex; gap: 10px; align-items: flex-start; padding: 9px 11px; cursor: pointer; border-radius: var(--radius-md); margin-bottom: 1px`

| 상태 | 배경 | 추가 효과 |
| --- | --- | --- |
| default | `transparent` | — |
| hover (비선택 행만) | `var(--surface-hover)` | JS(onMouseEnter/Leave)로 적용 |
| 선택됨 | `var(--tile-blue)` | `box-shadow: inset 2.5px 0 0 var(--accent)` (좌측 액센트 바) |
| focus | 미구현 (div, 키보드 접근 불가) | |

- 제목: `font-size: 14px; color: var(--text-primary); margin-bottom: 2px` — 1줄 말줄임
  (`white-space: nowrap; overflow: hidden; text-overflow: ellipsis`). 빈 제목 → `제목 없음`
- 메타 줄: `font-size: 12px; color: var(--text-tertiary)` — 1줄 말줄임.
  형식: `{상대 시간} · {본문 미리보기}` — 상대 시간은 **생성 시각(`created`) 기준**.
  미리보기는 본문의 연속 개행을 공백으로 치환하고 trim 후 앞 40자.
  본문 비어 있으면 `내용 없음`

**시간 표기 규칙** (`lib/data.ts`의 `rel()` — 목록·에디터 공용):

| 경과 | 표기 |
| --- | --- |
| 60초 미만 | `방금` |
| 1시간 미만 | `N분 전` |
| 24시간 미만 | `N시간 전` |
| 7일 미만 | `N일 전` |
| 그 이상 | `M월 D일` |

**목록 빈 상태**: `padding: 22px 12px; text-align: center; color: var(--text-tertiary); font-size: 13px; line-height: 1.6`
- 검색어가 있을 때: `검색 결과가 없어요.`
- 글이 하나도 없을 때: `아직 글이 없어요.` + 줄바꿈 + `‘＋ 새 글’로 시작하세요.`

### 4.3 Editor (`components/Editor.tsx`)

3열 글 상세 편집기. 선택된 글이 없으면 렌더하지 않음(EmptyState로 대체).

#### 탑바

`height: 44px; flex: none; border-bottom: 1px solid var(--border-subtle); padding: 0 16px` — 양끝 정렬

- **브레드크럼**: `font-size: 13px; color: var(--text-tertiary)` — 1줄 말줄임.
  형식: `내 글 › {제목 || 제목 없음}`
- 우측 그룹 (`gap: 14px`):
  - **저장 표시** (`font-size: 12px`) — 상태 4종. "저장됨 ✓"는 **서버 저장이
    성공한 뒤에만** 표시(낙관적 표시 금지):

    | 상태 | 조건 | 문구 | 색 |
    | --- | --- | --- | --- |
    | 평상시 | 기본 | `자동 저장` | `var(--text-tertiary)` |
    | 저장됨 | 서버 저장 성공 직후 1.5초 | `저장됨 ✓` | `var(--text-tertiary)` |
    | 저장 실패 | 서버 수정(update) 실패 | `저장 실패` | `var(--text-danger)` |
    | 삭제 실패 | 서버 삭제(delete) 실패 | `삭제 실패` | `var(--text-danger)` |

    실패 상태에서도 편집 중 내용은 화면에 유지되며, 다음 서버 저장 성공 시
    평상시로 복귀
  - **삭제 버튼**: `삭제` — `font-size: 13px; color: var(--text-danger); padding: 4px 8px; border-radius: var(--radius-sm); border: none; gap: 5px(inline-flex)`
    — default 배경 `transparent` / hover `var(--danger-subtle)` / 클릭 → 확인 팝오버 열림

#### 삭제 확인 팝오버

- 백드롭: `position: fixed; inset: 0; z-index: 10` (투명, 클릭 시 닫기, `aria-hidden`)
- 본체: `position: absolute; right: 0; top: 34px; z-index: 20; background: var(--surface-base); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); padding: 14px; width: 228px`
- 문구: `이 글을 삭제할까요?` + 줄바꿈 + `되돌릴 수 없어요.` —
  `font-size: 13px; color: var(--text-secondary); line-height: 1.55; margin-bottom: 12px`
- 버튼 행: 우측 정렬, `gap: 8px`
  - **취소**: `background: var(--surface-base); border: 1px solid var(--border-strong); color: var(--text-primary); font-size: 13px; padding: 5px 11px; border-radius: var(--radius-sm)`
  - **삭제**(확정): `background: var(--red-500); border: none; color: #fff;` 나머지 동일
  - 두 버튼 hover 스타일 미구현
- 확정 시 서버 삭제가 **성공한 뒤에만** 글이 목록에서 제거된다. 실패하면 글이
  유지되고 탑바 저장 표시가 `삭제 실패`로 바뀐다

> 커버·이모지 기능은 서버 저장 전환(002-supabase-page-crud, FR-009)으로
> 제거되었다 — page 테이블에 저장 컬럼이 없고 테이블 구조는 변경 불가.

#### 제목 입력

- `<input>`: `width: 100%; border: none; outline: none; background: transparent; font-family: var(--font-sans); font-size: 36px; font-weight: 700; letter-spacing: var(--tracking-tight); color: var(--text-primary); padding: 0; margin: 12px 0 8px`
  (상단 12px은 제거된 이모지의 `margin-top` 리터럴을 승계 — 본문 컬럼의 첫 요소)
- placeholder: `제목 없음` (색은 전역 placeholder 규칙 → `--text-tertiary`)
- 포커스 표시 없음 (`.nk-inp` 미적용, outline 제거됨)

#### 작성자 메타 줄

- `display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-tertiary); margin-bottom: 26px`
- 아바타: `20×20px; border-radius: 50%; background: var(--tile-blue); color: var(--tile-blue-text); font-size: 10px; font-weight: 600` — 이미지 또는 이니셜
- 내용: `{닉네임}` `·` `{rel(created)} 작성됨` (생성 시각 기준 — `updated`는
  저장 컬럼이 없어 제거됨)

#### 본문 입력

- `<textarea>`: `width: 100%; min-height: 340px; border: none; outline: none; resize: none; background: transparent; font-family: var(--font-sans); font-size: 16px; line-height: 1.75; color: var(--text-primary); padding: 0; overflow: hidden; display: block`
- placeholder: `여기에 입력하거나, 왼쪽에서 '/page'로 새 글을 만드세요…`
- 자동 높이: 입력·글 전환 시 `height = auto → scrollHeight px`로 재계산 (스크롤은 바깥 영역이 담당)
- 포커스 표시 없음

#### 글자 수 배지

- Editor 루트에 `position: relative` 적용, 배지는 그 안에 `position: absolute; right: 18px; bottom: 12px`로 고정 — 본문 스크롤과 무관하게 위치 불변
- 스타일: `background: var(--surface-overlay); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 4px 9px; font-size: 12px; color: var(--text-tertiary); pointer-events: none; user-select: none` (z-index 미지정 — 다른 팝오버가 항상 위)
- 내용: `{countChars(본문)}자` (`lib/chars.ts`) — 사용자 인지 글자(grapheme) 단위, 제목 제외, 공백·줄바꿈·조합 이모지·국기 각 1자
- 갱신: 본문 입력·삭제 시 같은 렌더 사이클에, 글 전환 시 새 글 기준으로 즉시 갱신 (`useMemo(() => countChars(active.body), [active.body])`)
- 가시성: Editor 자체가 글 미선택 시 렌더되지 않으므로 배지도 함께 사라짐 — 별도 조건 없음

### 4.4 EmptyState (`components/EmptyState.tsx`)

선택된 글이 없을 때 3열에 표시.

- 컨테이너: `height: 100%;` 세로 flex 가운데 정렬, `gap: 16px; padding: 40px; text-align: center`
- 이모지: `🗒️` — `font-size: 46px`
- 제목: `열려 있는 글이 없어요` — `font-size: 17px; font-weight: 600; color: var(--text-secondary)`
- 설명: `왼쪽 목록에서 글을 고르거나, 새 글을 만들어 기록을 시작하세요.` —
  `font-size: 14px; color: var(--text-tertiary); line-height: 1.6; max-width: 320px`
- **`＋ 새 글 만들기` 버튼**: `margin-top: 6px; height: 32px; padding: 0 14px; border: none; border-radius: var(--radius-sm); color: #fff; font-size: 14px; font-weight: 500; transition: background var(--duration-fast) var(--ease-standard)` — default `var(--accent)` / hover `var(--accent-hover)`

### 4.5 로그인 화면 요소 (`app/login/page.tsx`)

- **로고 타일**: `44×44px; border-radius: var(--radius-lg); background: var(--accent); color: #fff; font-size: 22px; font-weight: 700; margin-bottom: 18px` — 내용 `N` (`aria-hidden`)
- **서비스명**: `Nook` — `<h1>` `font-size: 30px; font-weight: 700; letter-spacing: var(--tracking-tight); color: var(--text-primary); margin: 0`
- **설명**: `개인 업무를 기록하는` + 줄바꿈 + `나만의 작은 공간` —
  `margin: 10px 0 34px; font-size: 15px; line-height: 1.55; color: var(--text-tertiary)`
- **`구글로 로그인` 버튼**: `width: 100%; inline-flex 가운데; gap: 10px; padding: 11px 18px; border-radius: var(--radius-lg); border: 1px solid var(--border-strong); color: var(--text-primary); font-size: 15px; font-weight: 500; transition: background var(--duration-base) var(--ease-standard)`
  - default `var(--surface-base)` / hover `var(--surface-subtle)` / active·focus 미구현
  - 클릭 시 `signInWithGoogle()`로 실제 구글 OAuth를 시작한다. 진행 중(`busy`)에는 `disabled`, `opacity: 0.6`, `cursor: default`, 라벨이 `구글로 이동 중…`으로 바뀐다.
  - 좌측에 `GoogleIcon` 18px (구글 브랜드 4색 "G": `#EA4335 #4285F4 #FBBC05 #34A853` — 앱에서 브랜드 컬러를 쓰는 유일한 곳)
- **로그인 실패 안내** (콜백 실패 `?error=auth` 또는 OAuth 시작 예외 시에만 표시): `로그인에 실패했어요. 잠시 후 다시 시도해 주세요.` —
  `role="alert"; margin: 14px 0 0; font-size: 13px; line-height: 1.5; color: var(--text-danger)`
- **안내 문구**: `로그인하면 내 글이 내 계정에 안전하게 저장됩니다.` —
  `margin: 22px 0 0; font-size: 12px; line-height: 1.6; color: var(--text-tertiary)`
  (글이 계정 기준 서버 저장소에 저장됨을 반영해 002 기능에서 문구 변경)

### 4.6 마이 페이지 요소 (`app/(app)/mypage/page.tsx`)

- **페이지 제목**: `마이 페이지` — `font-size: 24px; font-weight: 700; letter-spacing: var(--tracking-tight); margin-bottom: 6px`
- **부제**: `프로필을 편집하고, 별명과 프로필 이미지를 업데이트하세요.` —
  `font-size: 14px; color: var(--text-tertiary); margin-bottom: 34px`
- **프로필 행**: `gap: 18px; margin-bottom: 32px`
  - 아바타(업로드 트리거, `<label>` + 숨김 파일 입력): `72×72px; border-radius: 50%; overflow: hidden; background: var(--tile-blue); color: var(--tile-blue-text); font-size: 26px; font-weight: 600` — 이미지 또는 이니셜
  - 카메라 배지: 아바타 우하단 `right: -2px; bottom: -2px; 26×26px; border-radius: 50%; background: var(--surface-base); border: 1px solid var(--border-strong); font-size: 13px` — 내용 `📷`
  - 파일 입력: `accept="image/*"`, `display: none`, `aria-label="프로필 이미지 업로드"` —
    선택 즉시 서버 업로드(`POST /api/profile/image`, 003-profile-image). 이미지 MIME 타입이
    아니거나 5MB 초과면 요청 없이 안내 문구만 표시. 성공 시 아바타가 업로드된 이미지의
    공개 URL로 즉시 교체(레일 아바타 등 실시간 갱신). 선택 후 입력값을 비워 같은 파일
    재선택도 허용
  - 업로드 중 상태: 파일 입력 `disabled`, 아바타 `opacity: 0.6`, label `cursor: default`
  - 닉네임 표시: `font-size: 16px; font-weight: 600; color: var(--text-primary)`
  - 이메일 표시: `font-size: 13px; color: var(--text-tertiary)`
  - **이미지 상태 문구** (이메일 표시 아래, `font-size: 13px; margin-top: 4px`):
    | 상태 | 문구 | 색 |
    | --- | --- | --- |
    | 업로드 중 | `이미지를 업로드하는 중…` | `var(--text-tertiary)` |
    | 비이미지 파일 | `이미지 파일만 업로드할 수 있어요.` | `var(--text-danger)` |
    | 5MB 초과 | `이미지는 5MB까지 업로드할 수 있어요.` | `var(--text-danger)` |
    | 업로드 실패 | `이미지 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.` | `var(--text-danger)` |

    오류 문구는 다음 업로드 시도 시 제거. 평상시(idle·성공)에는 렌더하지 않음
- **필드 라벨** (`별명` / `이메일`): `font-size: 13px; color: var(--text-secondary); font-weight: 500; margin-bottom: 6px`
- **별명 입력**: `.nk-inp`; `width: 100%; border: 1px solid var(--border-strong); border-radius: var(--radius-sm); padding: 9px 11px; font-family: var(--font-sans); font-size: 14px; color: var(--text-primary); background: var(--surface-base); margin-bottom: 18px; transition: box-shadow .15s, border-color .15s` — placeholder `별명`. 입력 즉시 상태 반영(레일 아바타 이니셜 등 실시간 갱신). 저장은 `변경 사항 저장` 버튼 클릭 시 DB(`profile.name`)에 반영 (004-profile-db, 앞뒤 공백 제거해 저장)
- **이메일 입력 (disabled)**: `width: 100%; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 9px 11px; font-size: 14px; color: var(--text-tertiary); background: var(--surface-subtle); margin-bottom: 18px` — 항상 비활성(수정 불가)
- **자기소개 라벨** (`자기소개`): `<label for="nk-intro">` 요소 — 필드 라벨 공통 스타일 + `display: block`
- **자기소개 입력**: `<textarea id="nk-intro">` `.nk-inp`; `width: 100%; min-height: 120px; resize: none; border: 1px solid var(--border-strong); border-radius: var(--radius-sm); padding: 9px 11px; font-family: var(--font-sans); font-size: 14px; line-height: 1.6; color: var(--text-primary); background: var(--surface-base); display: block; margin-bottom: 6px; transition: box-shadow .15s, border-color .15s`
  - placeholder: `자신을 소개하는 글을 남겨보세요` (미등록 상태)
  - 값은 DB(`profile.introduction`)가 단일 원천 — localStorage에 저장하지 않음.
    마이페이지는 스토어 하이드레이션·프로필(DB) 조회 **및 자기소개 조회 완료**
    전까지 기존 로딩 화면(`flex: 1; background: var(--surface-base)` 빈 div)을
    유지한다
  - 저장 시 앞뒤 공백·줄바꿈만 있으면 미등록(null)으로 정규화. 줄바꿈·이모지는 그대로 보존
  - **불러오기 실패 상태**: textarea `disabled` + placeholder 미표시(미등록과 오인 방지),
    카운터 자리에 오류 문구 `자기소개를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.`
    (`font-size: 13px; color: var(--text-danger); margin-bottom: 30px`) — 이 상태에서 저장 버튼은 자기소개를 전송하지 않음
- **자기소개 글자 수 카운터**: textarea 바로 아래 우측 정렬 행 —
  `display: flex; justify-content: flex-end; font-size: 12px; margin-bottom: 30px`
  - 내용: `{countChars(값)}/500자` (`lib/chars.ts` — 글자 수 배지와 동일한 grapheme 단위)
  - 색: 500자 이내 `var(--text-tertiary)` / 500자 초과(레거시 저장본) `var(--text-danger)`
  - 한도 동작: 500자 초과가 되는 입력은 무시(짧아지는 편집은 항상 허용).
    500자 초과 저장본은 조회 시 전체를 그대로 표시하며 잘라내지 않는다.
    초과 상태로 저장 시도 시 요청 없이 안내 문구 `자기소개는 500자까지 저장할 수 있어요.` 표시
- **`변경 사항 저장` 버튼**: `height: 40px; padding: 0 18px; border: none; border-radius: var(--radius-sm); color: #fff; font-size: 14px; font-weight: 500; transition: background var(--duration-fast) var(--ease-standard)` — default `var(--accent)` / hover `var(--accent-hover)`
  - 클릭 시 별명(`PUT /api/profile`)과 자기소개(`PUT /api/profile/introduction`)를 저장하고, **모두 성공 시에만** 저장 확인 플래시를 트리거 (004-profile-db). 자기소개 불러오기 실패 상태에서는 별명만 전송. 프로필 이미지는 선택 즉시 저장(위 파일 입력 항목)
- **저장 확인 문구**: `저장되었습니다 ✓` — `font-size: 13px; color: var(--text-success)`, 버튼 우측 `gap: 14px`, 1.5초 후 사라짐. 등장/퇴장 애니메이션 없음
- **저장 오류 문구**: 버튼 우측(확인 문구와 같은 자리) — `font-size: 13px; color: var(--text-danger)`.
  다음 저장 시도 시 제거. 상황별 한국어 문구:
  - 별명이 공백뿐인 저장 시도: `별명을 입력해 주세요.` (요청 미발생)
  - 500자 초과 저장 시도: `자기소개는 500자까지 저장할 수 있어요.` (요청 미발생)
  - 저장 실패(네트워크/DB): `저장에 실패했습니다. 잠시 후 다시 시도해 주세요.` — 입력값은 유지되어 재시도 가능
- 로그아웃 버튼은 마이 페이지가 아니라 **전역 헤더 우측**에 있다 (§4.8).

### 4.7 아이콘 (`components/icons.tsx`)

Lucide 스타일 라인 아이콘. 공통 속성: `viewBox="0 0 24 24"; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round` (색은 부모의 `color` 상속).

| 아이콘 | 기본 크기 | 사용처 |
| --- | --- | --- |
| `HomeIcon` | 19px | IconRail 홈 버튼 |
| `PlusIcon` | 19px | IconRail 새 글 버튼 |
| `PanelLeftCloseIcon` | 19px | IconRail 접기 토글 (펼침 상태에서 표시, lucide panel-left-close) |
| `PanelLeftOpenIcon` | 19px | IconRail 접기 토글 (접힘 상태에서 표시, lucide panel-left-open) |
| `SearchIcon` | 15px | **미사용** (정의만 존재) |
| `TrashIcon` | 15px | **미사용** (정의만 존재) |
| `ImageIcon` | 15px | **미사용** (정의만 존재) |
| `SunIcon` | 16px | PostList 모드 전환 토글 — 다크 모드일 때 표시 (`aria-hidden`) |
| `MoonIcon` | 16px | PostList 모드 전환 토글 — 라이트 모드일 때 표시 (`aria-hidden`) |
| `GoogleIcon` | 18px | 로그인 버튼 (viewBox 0 0 48 48, 브랜드 4색 fill, `aria-hidden`) |

> 삭제 버튼은 아이콘 대신 텍스트를 사용한다.

### 4.8 전역 헤더 · 로그아웃 버튼 (`app/(app)/layout.tsx`, `components/LogoutButton.tsx`)

레일 오른쪽 콘텐츠 컬럼 최상단의 얇은 헤더 바. 모든 앱 화면에서 항상 표시되며 우측에 로그아웃 버튼만 둔다.

- 헤더 바: `height: 44px; flex: none; display: flex; align-items: center; justify-content: flex-end; padding: 0 16px; border-bottom: 1px solid var(--border-subtle); background: var(--surface-base)`
- **`로그아웃` 버튼** (`LogoutButton`, `title/aria-label="로그아웃"`): `height: 30px; padding: 0 12px; border: 1px solid var(--border-strong); border-radius: var(--radius-sm); color: var(--text-secondary); font-size: 13px; font-weight: 500; transition: background var(--duration-fast) var(--ease-standard)`
  - default 배경 `var(--surface-base)` / hover `var(--surface-subtle)` / focus 미구현
  - 진행 중(`loggingOut`)에는 `disabled`, `opacity: 0.6`, `cursor: default`, 라벨이 `로그아웃 중…`으로 바뀜
  - 클릭 → `signOut()`(Supabase 세션 종료) 후 `/login`으로 `router.replace`

---

## 5. 인터랙션 & 플로우

README 흐름도와 코드 대조 결과, 아래 플로우가 모두 코드와 일치함을 확인했다.

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

1. **로그인 가드** (양방향, 실제 Supabase Auth):
   - 인증은 **Supabase Auth + Google OAuth 2.0**. 세션은 `@supabase/ssr`가 쿠키에 저장하며, 서버(미들웨어·콜백 라우트)와 클라이언트가 세션을 공유한다.
   - **미들웨어**(`middleware.ts`)가 1차 가드: 미로그인 상태로 앱 경로 접근 → `/login` 리다이렉트, 로그인 상태로 `/login` 접근 → `/` 리다이렉트. 정적 자산·`/auth/*`는 통과.
   - 클라이언트 2차 가드(`(app)/layout.tsx`): `getUser()`로 확인, 미로그인이면 `/login`으로 `router.replace`. 확인 전까지는 `--surface-canvas` 빈 화면(플래시 방지). `onAuthStateChange`로 로그아웃·세션 만료를 감지하면 `/login`으로 이동.
   - 로그인 흐름: `/login`의 `구글로 로그인` → `signInWithOAuth('google')` → 구글 동의 화면 → `/auth/callback`(서버 라우트)에서 인가 코드를 세션으로 교환(PKCE) → `/`. 실패 시 `/login?error=auth`로 복귀.
   - **로그아웃**: 전역 헤더 우측 상단 `로그아웃` 버튼(§4.8) → `supabase.auth.signOut()` → `/login` (`lib/auth.ts`).
2. **새 글 생성** (3가지 진입점, 동일 동작):
   - 목록 명령 입력창에 `/page`(또는 `/new`, `/page ...`) 입력 후 Enter
   - 목록 헤더 `＋ 새 글` 버튼 / 빈 상태 `＋ 새 글 만들기` 버튼
   - 레일 `+` 버튼 (추가로 `/`로 이동)
   - 새 글: 서버(page 테이블)에 빈 제목·빈 본문으로 등록된 뒤 목록 맨 앞에
     추가되고 즉시 선택되어 에디터가 열림. 등록 실패 시 글이 생성되지 않고
     목록 구분선 아래에 `새 글을 만들지 못했어요.` 안내가 표시됨
3. **자동 저장(서버)**: 제목·본문 수정(`patch`)은 로컬 상태에 즉시 반영(입력
   반응성)되고, 마지막 입력 후 600ms 디바운스로 서버에 1회 저장된다(글 전환·
   화면 이탈 시 보류 변경 즉시 저장). 저장 표시는 서버 저장이 **성공한 뒤에만**
   `자동 저장` → `저장됨 ✓`로 바뀌고 1500ms 후 복귀(연속 성공 시 타이머 리셋).
   실패 시 `저장 실패`(빨강)로 바뀌고 편집 내용은 화면에 유지되며, 실패한
   변경분은 다음 저장에서 재전송된다
4. **삭제 확인**: 탑바 `삭제` → 팝오버 (`취소` / `삭제`). 확정 시 서버 삭제가
   성공한 뒤 글이 제거되고 남은 글 중 첫 번째(배열 순서 기준 첫 항목)가 자동
   선택, 없으면 빈 상태 표시. 실패 시 글 유지 + 저장 표시 `삭제 실패`
5. **팝오버 공통 패턴**: 투명 전면 백드롭(z 10) 클릭으로 닫기. 팝오버 본체는 z 20.
   글을 전환하면 열려 있던 팝오버(삭제 확인)는 닫힘. Esc 닫기 미구현
6. **목록 선택**: 행 클릭 → `selectedId` 변경 → 에디터가 해당 글로 전환.
   선택 상태는 메모리 전용(영속하지 않음) — 새로고침하면 최신 생성 글이 선택됨
7. **아바타 → 마이 페이지**: 레일 하단 아바타 클릭 → `/mypage`. 별명 입력은
   화면에 즉시 반영되고, `변경 사항 저장` 버튼 클릭 시 자기소개와 함께 DB에
   저장된다 (004-profile-db, 모두 성공 시에만 확인 플래시). 이미지 업로드는
   선택 즉시 서버 저장(Storage 업로드 + `profile.image_path` 갱신,
   003-profile-image) 후 성공 시에만 아바타 교체. 자기소개는 진입 시 DB에서
   조회해 표시
8. **사이드바 접기/펼치기** (002-sidebar-collapse, 업무 화면 전용): 레일 최상단
   토글 버튼 클릭 → 레일 내용 + 글 목록이 함께 접혀 60px 스트립(토글만)이 남고,
   다시 클릭하면 펼쳐진다. 전환 모션 없음(즉시). 접기는 표시만 바꾼다 — 선택
   글·검색어·명령 입력값은 다시 펼치면 그대로(글 목록은 display 숨김으로 마운트
   유지). 접힘 상태는 저장하지 않으며 새로고침·재방문·마이 페이지 왕복 시
   펼침으로 시작. 마이 페이지에는 토글이 없다(레일 항상 표시)
9. **모드 전환** (002-dark-mode): 글 목록 헤더의 토글 클릭 → `<html data-theme>`
   즉시 반전(전 화면 단일 리페인트) + `nook-theme` 저장. 재방문 시 저장값 복원
   (`"light"`만 인정, 그 외 전부 기본 다크 — OS 설정 무시). 로그인 화면은 현재
   모드 표시만. 이미 열린 다른 탭과의 실시간 동기화는 범위 밖
10. **데이터**:
   - 글은 Supabase `page` 테이블에 계정(user_id) 기준으로 저장되며, RLS 정책이
     본인 글만 조회·수정·삭제되도록 강제한다. 시드 글 자동 생성은 없음 —
     글이 없는 계정은 빈 상태에서 시작
   - 목록 로드 동안 목록 영역에 `불러오는 중…` 표시(빈 상태 문구는 로드 완료
     후에만). 조회 실패 시 `글을 불러오지 못했어요.` + `다시 시도`
   - 프로필: **DB `profile` 테이블이 단일 원천** (004-profile-db) — 별명 =
     `name`, 이미지 경로 = `image_path`, 자기소개 = `introduction`. 로그인 시
     스토어가 `GET /api/profile`로 별명·이미지를 조회해 반영하고, DB 값이
     없거나 조회 전·실패 시에는 구글 계정 폴백을 쓴다 — 별명 =
     `user_metadata.full_name`(없으면 `name`, 그다음 이메일 앞부분), 아바타 =
     구글 프로필 사진(`avatar_url`/`picture`). 이메일 = 계정 이메일(수정 불가,
     항상 계정 값). 프로필은 localStorage에 저장하지 않는다(구 `mini-nook-v1`
     프로필 영속은 004에서 제거). `DEFAULT_PROFILE`(닉네임 `경현`, 이메일
     `kyunghyun@gmail.com`)은 유저가 없을 때(예: 단위 테스트)만 쓰이는 폴백.
   - 프로필 API 공통 규칙 (004-profile-db): 서버 라우트(`/api/profile`,
     `/api/profile/introduction`, `/api/profile/image`)는 쿠키 세션으로 로그인
     유저를 확인(미로그인 401)한 뒤 서비스 롤 키로 본인(`user_id`) profile
     행만 읽고 쓴다 (`lib/server/profile.ts` — 구 "created_at 첫 행" 단일
     사용자 규칙 대체).
   - 저장 키: 테마 `nook-theme`만. 글·선택 상태·프로필은 localStorage에
     저장하지 않는다(구 `mini-nook-v1` 제거). **인증은 localStorage가 아니라
     Supabase 세션 쿠키**로 관리(구 `nook-auth` 플래그 제거).
   - 자기소개: Supabase `profile.introduction` 컬럼이 단일 원천 —
     `/api/profile/introduction`(GET/PUT, 서버 라우트)을 통해 조회·저장하며
     localStorage에 저장하지 않는다 (002-profile-introduction)
   - 프로필 이미지 (003-profile-image): 업로드 원본은 Supabase Storage
     `profile-image` 버킷(공개)에 **uuidv4 파일명**(+원본 확장자)으로 저장 —
     `/api/profile/image`(GET/POST, 서버 라우트) 경유. DB `profile.image_path`
     컬럼에는 **버킷명 이후 경로**만 기록하고, 표시 URL은
     `NEXT_PUBLIC_PROFILE_IMAGE_BASE_URL`(스토리지 주소~버킷명) + `/` +
     `image_path`로 조합한다 (`lib/profile-image.ts`). 로그인 시 스토어가 DB
     값으로 아바타를 동기화(실패 시 구글 사진/이니셜 폴백, 화면 비차단)해
     레일·에디터·마이 페이지 아바타에 반영하고, 업로드 성공 시 이전 파일은
     스토리지에서 삭제한다

---

## 6. 접근성 · 반응형

### 코드에 존재하는 것

- 아이콘 레일: `<nav aria-label="주요 탐색">`, 아이콘 버튼에 `title` + `aria-label` (홈 / 새 글 / 마이 페이지 / 사이드바 접기 / 사이드바 펼치기)
- 장식 요소 `aria-hidden`: 로그인 로고 타일, GoogleIcon, 팝오버 백드롭
- `.nk-inp` 포커스 링: 보더 `var(--border-focus)` + `box-shadow 0 0 0 3px var(--focus-ring)` (검색·명령·별명 입력에 적용)
- `@media (prefers-reduced-motion: reduce)` — 전 요소 전환·애니메이션 0.001ms로 축소
- `<html lang="ko">`, 시맨틱 `<h1>`(로그인), viewport 메타 설정
- 아바타 `<img>`에 `alt=""` (장식 취급)
- 다크/라이트 모드: 기본 다크, 토글 버튼에 상태별 한국어 `title`/`aria-label`
  (`라이트 모드로 전환`/`다크 모드로 전환`), 아이콘 SVG는 `aria-hidden`.
  본문 텍스트 대비 — 다크 `#d6d5d1`/`#191919` 약 12:1, 라이트 `#1f1e1b`/`#ffffff`
  약 16:1 (WCAG AA 충족)

### 현재 미구현

- 버튼·목록 행의 키보드 포커스 표시 (전역 `outline: none`은 input/textarea에만 적용되나, 버튼에 커스텀 포커스 스타일 없음 — 브라우저 기본에 의존)
- 글 목록 행이 `<div onClick>` — 키보드 탐색·role·tabindex 없음
- 팝오버의 포커스 트랩, Esc 닫기, `role="dialog"`/`aria-expanded` 등 ARIA 상태
- 반응형 레이아웃: 미디어쿼리 없음. 3분할 폭 고정(60 + 256 + 나머지). 로그인 카드만 `max-width: 100%`로 좁은 화면 대응
- 최소 터치 타깃 크기 보장, 전 상태 조합의 색 대비 검증 문서화 (본문 기본 대비만 §6 상단에 기록)

---

## 7. 참조 이미지와의 차이점

`03-reference-design.png`는 메신저형 워크스페이스("유아이볼")의 AI 어시스턴트 홈 화면
스크린샷으로, 구현된 Nook과는 **제품 구조 자체가 다르다**. 톤(밝은 회색 사이드바 + 흰 콘텐츠 +
블루 액센트 + 한국어 UI)의 참조로 보이며, 아래 차이는 모두 **코드 구현이 정답**이다.

| 항목 | 참조 이미지 | Nook 구현 |
| --- | --- | --- |
| 상단 글로벌 바 | 로고·워크스페이스명·알림/조직도/검색/도움말/앱/메뉴 아이콘의 가로 탑바 존재 | 최소 헤더만 존재 — 우측에 로그아웃 버튼 하나(§4.8). 나머지 탐색은 세로 아이콘 레일 |
| 사이드바 | 넓은 텍스트 사이드바 — 홈, 대화방 검색(Cmd+J), 토픽/채팅/앱 아코디언 섹션, 즐겨찾기 별 | 60px 아이콘 레일 + 256px 글 목록 패널 (2단) |
| 메인 영역 | AI 어시스턴트 홈 — 인사말, 제안 칩 3개, 프롬프트 입력창, 요약/바로가기 카드, 일정·할 일 위젯(도넛 차트) | 문서 에디터 (커버·이모지·제목·본문) 또는 빈 상태 |
| 검색 | 사이드바 상단 대화방 검색 + 단축키 배지(Cmd+J) | 글 목록 상단 검색 입력 (단축키 없음) |
| 명령 입력 | 없음 (AI 프롬프트 입력창) | `/page` 슬래시 명령 입력창 |
| 그래픽 요소 | 도넛 차트, 컬러 아이콘 배지, 그라데이션 로고 타입 | 플랫 이모지·단색 타일만 사용 |
| 브랜드 | "ui bowl" 로고, Sprinkler 워드마크(청록→파랑) | `N` 로고 타일 (`--accent` 단색) |
| 공통점 | 밝은 회색 사이드바 + 흰 메인, 파란 액센트, 둥근 모서리 카드, 한국어 UI | 동일한 톤 유지 |

---

## 8. 검증

작성 후 자가 검증 결과.

### 8.1 토큰 전수 대조

- `globals.css` `:root`의 커스텀 프로퍼티 선언 수: **103개**
  (정규식 `^\s*--[a-z0-9-]+:` grep 카운트는 `html[data-theme="dark"]` 재정의
  22개를 포함해 총 125를 반환 — 신규 선언은 `:root`의 103개가 전부)
- 본 문서 §2에 기록된 토큰 수: 색상 프리미티브 35 (gray 14 + blue 7 + green/amber/red 9 + tile 5)
  + 시맨틱 28 (text 9 + surface 7 + border 4 + accent 4 + focus-ring 1 + 오버레이·틴트 3)
  + 타이포 21 (family 2 + size 9 + weight 4 + leading 4 + tracking 2)
  + radius 6 + shadow 6 + 레이아웃 2 + 모션 5 = **103개 → 누락 0개 확인**
- 다크 재정의 22개(시맨틱 19 + 오버레이·틴트 3)는 §2.7 표와 1:1 대조 완료
- `--font-pretendard`는 globals.css가 아닌 `next/font`(layout.tsx)가 주입하므로 위 카운트에 포함되지 않으며, §2.3에 별도 기록함

### 8.2 컴포넌트 파일별 재확인 (5개)

| 파일 | 확인 결과 |
| --- | --- |
| `IconRail.tsx` | 치수(60/34/38/30px), 상태 3종, 선택 링, 이니셜 폴백 모두 §4.1에 기록 — 누락 없음 |
| `PostList.tsx` | 패널 256px, 헤더(+모드 토글)/검색/명령 입력/구분선/행 상태/시간·미리보기 규칙/빈 상태 2종 + 로딩·조회 실패·생성 실패 상태(002) §4.2에 기록 — 누락 없음 |
| `Editor.tsx` | 탑바 44px, 저장 표시 4종(002), 삭제 팝오버(228px), 제목 36px(상단 12px), 메타 줄(작성됨), 본문 textarea(340px, 1.75) §4.3에 기록 — 커버·이모지는 002에서 제거 |
| `EmptyState.tsx` | 이모지 46px, 제목/설명/버튼 값 §4.4에 기록 — 누락 없음 |
| `icons.tsx` | 8종 아이콘 공통 속성·크기·사용처(미사용 3종 포함) §4.7에 기록 — 누락 없음 |

페이지 파일(`login`, `(app)/layout`, `(app)/page`, `mypage`)의 스타일도 §3·§4.5·§4.6에서 대조 완료.

### 8.3 다크 모드 업데이트 검증 (2026-07-16, 002-dark-mode)

- §2.7 다크 표 22개 값 ↔ `globals.css` `html[data-theme="dark"]` 블록 1:1 대조 완료
- 신규 시맨틱 토큰 3개(`--surface-overlay`, `--tile-blue-text`, `--danger-subtle`)의
  라이트 값과 사용처(§2.2·§4.1·§4.3·§4.6) ↔ 코드 대조 완료 — 라이트 렌더 결과 불변
- 토글 버튼 명세(§4.2) ↔ `PostList.tsx` 대조 완료. 동작은
  `components/PostList.theme.test.tsx`·`lib/theme.test.ts`가 검증
- 테마 부트스트랩(§2.6) ↔ `app/layout.tsx`·`lib/theme.ts` 대조 완료

### 8.4 의도적 제외 항목

1. **SVG path 데이터** (icons.tsx의 `d` 속성 좌표) — 아이콘 형태는 "Lucide 스타일 홈/플러스/검색/휴지통/이미지/구글 G"로 특정 가능하며, 좌표 나열은 디자인 명세 목적에 기여하지 않아 제외. 재구현 시 lucide.dev 동명 아이콘 사용으로 동일 결과 획득 가능 (Google G는 §4.5의 4색 값 기록)
2. **시드 글의 본문 전문** — 디자인이 아닌 콘텐츠이므로 제목·이모지·커버·타임스탬프만 기록 (§5-8). 전문은 `lib/data.ts` `makeSeed()` 참조
3. **상태 관리 내부 구현** (React Context 구조, useCallback 등) — UI에 노출되는 동작(자동 저장 타이밍, 선택 이동 규칙, 영속 키)만 기록하고 코드 구조는 제외
4. **`화면 캡처 2026-07-07 112832.png`** — 프롬프트가 지정한 원본 목록에 없는 파일이므로 대조 대상에서 제외
