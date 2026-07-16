# Research: 사이드바 접기/펼치기

**Feature**: `002-sidebar-collapse` | **Date**: 2026-07-16

Technical Context에 NEEDS CLARIFICATION은 없다. 아래는 구현 방식을 확정하기
위해 검토한 설계 결정 7건이다. 코드 근거는 2026-07-16에 직접 읽은
`app/(app)/layout.tsx`, `app/(app)/page.tsx`, `app/(app)/mypage/page.tsx`,
`components/IconRail.tsx`, `components/PostList.tsx`, `lib/store.tsx`,
`DESIGN.md` 전문이다.

## R1. 레일 렌더 위치: 앱 셸 → 각 페이지로 이동

- **Decision**: `(app)/layout.tsx`(AppShell)의 `<IconRail />` 렌더를 제거하고,
  업무 페이지(`(app)/page.tsx`)와 마이 페이지(`(app)/mypage/page.tsx`)가 각각
  `<IconRail />`을 직접 렌더한다.
- **Rationale**: 접힘 상태는 업무 화면 전용이며(FR-009) 레일과 글 목록을 함께
  숨겨야 한다(Clarifications). 레일이 공용 레이아웃에 있으면 페이지의 상태를
  레이아웃과 공유해야 해서 React 컨텍스트 신설이 필요해진다. 레일 렌더를
  페이지로 내리면 `collapsed` 상태·토글·숨김이 모두 `(app)/page.tsx` 한 곳에
  모이고, 마이 페이지는 프롭 없는 레일을 렌더해 FR-009가 구조적으로 보장된다.
  화면 모습은 변하지 않는다.
- **Alternatives considered**:
  - *SidebarProvider 컨텍스트 신설 (레일은 레이아웃 유지)* — 파일 1개·프로바이더
    1개·소비자 2곳이 늘고 상태 소유가 분산된다. 헌법 IV(YAGNI) 위배 수준의
    과설계라 기각.
  - *pathname 기반으로 레이아웃에서 조건 분기* — 토글 버튼(페이지 상태)과
    렌더 조건(레이아웃)이 갈라져 결국 컨텍스트가 필요해진다. 기각.

## R2. 상태 관리: 업무 페이지 로컬 useState, 비영속

- **Decision**: `(app)/page.tsx`에 `const [collapsed, setCollapsed] =
  useState(false)` 하나만 둔다. localStorage에 저장하지 않는다.
- **Rationale**: Clarifications에서 비영속 확정(새로고침·재방문 시 항상 펼침).
  마이 페이지를 다녀오면 컴포넌트 언마운트로 자연히 펼침 기본값으로 복귀하는데,
  이는 spec Edge Case가 명시적으로 허용한 동작이다. 스토어(`lib/store.tsx`)
  확장이 불필요하다.
- **Alternatives considered**: *NookStore에 편입 + localStorage 영속* —
  FR·Clarifications가 명시적으로 배제(범위 밖). 기각.

## R3. 접힘 시 숨김 방식: 마운트 유지 + 표시 숨김 (언마운트 금지)

- **Decision**: 접힘 시 `PostList`를 조건부 렌더로 제거하지 않고, 래퍼
  `<div style={{ display: collapsed ? "none" : "contents" }}>`로 감싸 표시만
  숨긴다. `IconRail`은 항상 마운트된 채 `collapsed` 프롭으로 내용만 전환한다.
- **Rationale**: `PostList`는 검색어(`search`)·명령 입력(`cmd`)을 컴포넌트
  로컬 `useState`로 들고 있다(PostList.tsx:9-10). 언마운트하면 검색어가
  초기화되어 FR-005("다시 펼치면 검색어 유지")와 US2 시나리오 2를 위반한다.
  `display: none`은 React 상태를 보존하면서 레이아웃에서 완전히 제거하고,
  `display: contents` 래퍼는 펼침 상태에서 기존 flex 레이아웃(256px flex-none
  패널)에 영향을 주지 않는다.
- **Alternatives considered**:
  - *조건부 렌더(언마운트)* — 검색어 초기화로 FR-005 위반. 기각.
  - *검색어 상태를 페이지/스토어로 끌어올리기* — PostList 개조 범위가 커지고
    스토어 오염. 숨김 한 줄로 충분한 일에 과한 리팩터(헌법 IV). 기각.
  - *width: 0 + overflow: hidden* — 포커스 가능한 요소가 화면 밖에 남아 탭
    이동이 보이지 않는 요소로 들어가는 부작용. `display: none`은 접근성
    트리에서도 제거되어 의도와 일치. 기각.

## R4. 접힘 스트립: IconRail의 "스트립 모드"로 구현 (신규 컴포넌트 없음)

- **Decision**: 접힘 시 별도 컴포넌트를 만들지 않고, `IconRail`이
  `collapsed=true`일 때 기존 `<nav>` 컨테이너(60px, `--surface-sidebar`,
  `border-right: 1px solid var(--border-subtle)`, `padding: 12px 0`) 안에
  **토글 버튼 하나만** 렌더한다. 워크스페이스 타일·홈·새 글·아바타는 렌더하지
  않는다.
- **Rationale**: spec의 "좁은 세로 스트립"을 기존 레일 컨테이너 재사용으로
  구현하면 새 스타일 값이 하나도 필요 없다(헌법 II — DESIGN.md §4.1의 기록된
  값만 사용). 스트립 폭 60px은 316px 대비 충분히 좁고, 같은 컨테이너이므로
  토글 버튼이 접힘/펼침에서 **정확히 같은 위치**에 남는다(Clarifications
  "같은 토글 버튼" 취지). RailButton(34×34, `--radius-md`, hover
  `--surface-hover`)도 그대로 재사용한다.
- **Alternatives considered**:
  - *더 좁은 스트립(예: 24~28px)* — DESIGN.md에 없는 새 치수 값을 발명해야
    한다(헌법 II 위배). 버튼(34px)이 들어가지도 않는다. 기각.
  - *별도 `CollapsedStrip` 컴포넌트* — RailButton 재사용을 위해 export를
    늘리거나 스타일을 복제해야 한다. IconRail 내 분기가 더 단순. 기각.

## R5. 토글 버튼: 레일 최상단, lucide panel-left 계열 아이콘, 한국어 라벨

- **Decision**: 토글 버튼은 RailButton 스타일로 레일 **최상단**(워크스페이스
  타일 위)에 배치한다. `IconRail`에 `onToggleSidebar?: () => void` 프롭이
  있을 때만 렌더한다(마이 페이지는 프롭 미전달 → 버튼 없음, FR-009). 아이콘은
  lucide 동명 `panel-left-close`(펼침 상태에서 표시)·`panel-left-open`(접힘
  상태에서 표시) 19px, title/aria-label은 "사이드바 접기"/"사이드바 펼치기".
- **Rationale**: 최상단 배치는 접힘 스트립(토글만 남음)과 펼침 레일에서 버튼
  y-위치를 동일하게 만들어 연타 시에도 마우스 이동이 없다(US1 시나리오 4).
  아이콘 추가 방식은 DESIGN.md §8.3의 기존 관례("lucide.dev 동명 아이콘")를
  따르고, 크기 19px·색 상속은 기존 레일 아이콘(§4.7)과 동일하다. 라벨은
  헌법 III(한국어 UI) 준수이며 기존 레일 버튼의 title+aria-label 패턴과 같다.
  이 배치·아이콘 결정은 DESIGN.md에 없던 신규 사항이므로 본 plan 검토가
  사용자 확인 절차이며, 구현 시 같은 작업 단위로 DESIGN.md에 기록한다(원칙 V).
- **Alternatives considered**:
  - *레일 하단(아바타 위) 배치* — 접힘 스트립에서 버튼만 남으면 상단이 자연스러워
    상태 간 위치가 어긋난다. 기각.
  - *글 목록 패널 헤더에 버튼 배치* — 접힘 시 패널과 함께 사라져 FR-004(항상
    보임)를 별도 장치 없이 만족할 수 없다. 기각.
  - *chevrons-left/right 아이콘* — panel-left 계열이 "사이드바" 대상임을 더
    분명히 전달. 기각.

## R6. 전환 모션: 없음

- **Decision**: 접힘/펼침은 렌더 분기·display 전환만으로 즉시 이루어진다.
  width transition·keyframes를 추가하지 않는다.
- **Rationale**: Clarifications에서 "모션 없음" 확정(FR-010, SC-002). 기존
  앱에 레이아웃 애니메이션이 전무해(DESIGN.md §2.5 — 전환은 배경색뿐,
  keyframes 없음) 일관적이며 `prefers-reduced-motion` 고려도 불필요해진다.
- **Alternatives considered**: *`--duration-slow` 220ms 슬라이드* — 사용자가
  명시적으로 기각(Clarifications).

## R7. 테스트 전략: RTL + 실제 스토어, next/navigation만 최소 모킹

- **Decision**: 테스트 2개 파일을 테스트 먼저(RED) 작성한다.
  - `components/IconRail.test.tsx`: 프롭 없으면 토글 버튼 미렌더(FR-009),
    `onToggleSidebar` 있으면 "사이드바 접기" 버튼 렌더, `collapsed=true`면
    "사이드바 펼치기"만 남고 홈·새 글·아바타·워크스페이스 타일 미렌더,
    클릭 시 콜백 호출.
  - `app/(app)/page.test.tsx`: 기본 펼침(FR-008) → 토글 클릭으로 글 목록
    사라짐/재클릭으로 복원(US1), 연타 후 상태 정확(US1-4), 접힘 중 본문 편집
    동작(US2-1), 검색어 입력 → 접기 → 펼치기 후 값 유지(US2-2, R3 검증),
    접힘 시 홈·새 글·아바타 미노출(US2-3).
  - 렌더는 실제 `NookProvider`로 감싸고(jsdom localStorage 사용, 모킹 아님),
    `next/navigation`의 `useRouter`/`usePathname`만 `vi.mock`으로 대체한다.
- **Rationale**: 헌법 I의 모킹 규칙 — 실제 코드 동작 검증이 원칙이나,
  `next/navigation` 훅은 jsdom에 App Router 런타임이 없어 실제 구현 실행이
  불가능한 외부 의존(불가피한 최소 모킹)이다. 스토어·컴포넌트는 전부 실물을
  사용한다. 편집 영역 폭 확대(SC-004)는 jsdom이 실제 레이아웃을 계산하지
  않으므로 "글 목록·레일 비노출"을 프록시로 검증하고, 시각 확인은
  quickstart의 수동 시나리오로 커버한다.
- **Alternatives considered**: *Playwright E2E* — 프로젝트에 E2E 하네스가
  없고 헌법의 테스트 환경(Vitest+RTL)으로 충분. 기각.
