# Tasks: 다크 모드

**Input**: Design documents from `/specs/002-dark-mode/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/theme-contract.md, quickstart.md

**Tests**: Tests are MANDATORY per constitution Principle I (TDD — superpowers `/test-driven-development`). Every user story MUST include test tasks placed and executed BEFORE its implementation tasks, and each test MUST be verified to fail before implementing.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

단일 Next.js 앱 (repository root): `app/`, `components/`, `lib/`.
테스트는 소스 옆 콜로케이션(`*.test.ts(x)`). 색 값은
[research.md R4·R5](./research.md)의 확정 표를 그대로 사용한다.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 기준선 확보 — 신규 프로젝트 초기화는 불필요(기존 앱에 기능 추가)

- [X] T001 기준선 확인: 리포 루트에서 `npm test` 실행, 기존 스위트(lib/chars.test.ts, lib/data.test.ts, components/Editor.test.tsx, test/harness.test.tsx) 전체 통과·출력 무결(에러·경고 0)을 확인하고 시작한다

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 테마 코어 모듈과 다크 토큰 기반 — 모든 사용자 스토리가 의존

**⚠️ CRITICAL**: 이 페이즈 완료 전에는 어떤 사용자 스토리도 시작할 수 없다

- [X] T002 [RED] `lib/theme.test.ts` 신규 작성 — 테마 코어 실패 테스트
  (contracts/theme-contract.md C1·C3 기준):
  `getInitialTheme()` — 저장값 없음 → `"dark"` / `"light"` → `"light"` /
  `"dark"` → `"dark"` / 무효값(`"banana"`, `"LIGHT"`, `""`) → `"dark"` /
  localStorage 접근 예외 → `"dark"`(throw 금지);
  `applyTheme(t)` — `document.documentElement`의 `data-theme` 속성 설정 +
  localStorage `nook-theme` 저장, 저장 예외 시 조용히 실패(속성은 설정됨).
  `npm test`로 "lib/theme.ts 부재/기능 부재" 이유의 실패(RED)를 확인한다
- [X] T003 `lib/theme.ts` 신규 구현 — `Theme` 타입, `THEME_KEY = "nook-theme"`,
  `DEFAULT_THEME = "dark"`, `getInitialTheme()`, `applyTheme()` (C3 시그니처,
  try/catch 패턴은 lib/auth.ts와 동일). T002 테스트 GREEN + 기존 스위트
  무결 확인
- [X] T004 `app/globals.css` 수정 — (1) `:root`에 신규 시맨틱 토큰 3개
  라이트 값 추가: `--surface-overlay: rgba(255, 255, 255, 0.92)`,
  `--tile-blue-text: var(--blue-700)`, `--danger-subtle: var(--red-50)`;
  (2) `html[data-theme="dark"]` 블록 신설 — research.md R4 표의 시맨틱 19개
  + 신규 3개의 다크 값(`--surface-overlay: rgba(25,25,25,0.85)`,
  `--tile-blue-text: #7fb4ec`, `--danger-subtle: #3d2422`);
  (3) 다크 스크롤바 규칙 `html[data-theme="dark"] ::-webkit-scrollbar-thumb
  { background: #3a3a38 }` + hover `#474743`. CSS는 jsdom 검증 불가 —
  `npm test` green 유지 확인, 시각 검증은 quickstart S6
- [X] T005 [P] `components/Editor.tsx` 리팩터 — 커버 버튼 2곳·글자 수 배지
  1곳의 `rgba(255,255,255,.92)` → `var(--surface-overlay)`, 삭제 버튼 hover
  `var(--red-50)` → `var(--danger-subtle)`, 메타 줄 아바타 이니셜
  `var(--blue-700)` → `var(--tile-blue-text)`. 동작 불변 리팩터 —
  components/Editor.test.tsx 포함 전체 스위트 green 유지 확인
- [X] T006 [P] `components/IconRail.tsx` 리팩터 — 아바타 이니셜
  `var(--blue-700)` → `var(--tile-blue-text)`. `npm test` green 유지
- [X] T007 [P] `app/(app)/mypage/page.tsx` 리팩터 — 아바타 이니셜
  `var(--blue-700)` → `var(--tile-blue-text)`. `npm test` green 유지

**Checkpoint**: 테마 코어 + 다크 토큰 기반 완료 — 사용자 스토리 착수 가능

---

## Phase 3: User Story 1 - 사이드바 토글로 모드 전환 (Priority: P1) 🎯 MVP

**Goal**: 글 목록 패널 상단 헤더의 토글 버튼 클릭으로 다크 ↔ 라이트가
새로고침 없이 즉시 전환된다 (FR-001·002·003·008)

**Independent Test**: quickstart.md S2 — 헤더 토글 클릭 → 전 화면 즉시 전환,
아이콘·툴팁 상태 전환, 재클릭 원복

### Tests for User Story 1 (MANDATORY — constitution Principle I: TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T008 [US1] [RED] `components/PostList.test.tsx` 신규 작성 — 실제
  `NookProvider`로 감싼 PostList 렌더(모킹 금지, 계약 C4 기준):
  (1) 헤더에 `aria-label="라이트 모드로 전환"` 버튼 존재(초기 다크,
  `<html data-theme="dark">` 사전 설정); (2) 클릭 →
  `document.documentElement.getAttribute("data-theme") === "light"` +
  버튼 라벨이 `"다크 모드로 전환"`으로 전환; (3) 재클릭 → `"dark"` 원복;
  (4) 토글 클릭이 글 목록(새 글 생성 등)에 부수효과 없음.
  `npm test`로 "토글 버튼 부재" 이유의 실패(RED) 확인

### Implementation for User Story 1

- [X] T009 [P] [US1] `components/icons.tsx`에 `SunIcon`, `MoonIcon` 추가 —
  기존 공통 속성(viewBox 24, stroke currentColor, stroke-width 2, round) 동일,
  기본 크기 16px, Lucide 동명 아이콘(sun/moon) 형태
- [X] T010 [US1] `lib/theme.ts`에 `useTheme(): { theme, toggle }` 훅 추가 —
  초기값은 `document.documentElement`의 현재 `data-theme` 속성(부재 시
  `getInitialTheme()`), `toggle`은 상태 반전 + `applyTheme` 호출(C3)
- [X] T011 [US1] `components/PostList.tsx` 헤더 우측 그룹에 토글 버튼 구현 —
  `＋ 새 글` 버튼 왼쪽, 28×28px 아이콘 버튼(계약 C4): 다크면 `SunIcon` +
  `title`/`aria-label="라이트 모드로 전환"`, 라이트면 `MoonIcon` +
  `"다크 모드로 전환"`; 배경 default `transparent`/hover
  `var(--surface-hover)`(기존 addHover 패턴), 아이콘 색
  `var(--text-tertiary)`, radius `var(--radius-sm)`, `transition: background
  var(--duration-fast) var(--ease-standard)`. T008 GREEN + 전체 스위트
  무결 확인

**Checkpoint**: US1 독립 검증 가능 — `npm run dev` + quickstart S2

---

## Phase 4: User Story 2 - 기본값은 다크 모드 (Priority: P2)

**Goal**: 저장된 선택이 없으면(무효 포함) 로그인 화면을 포함한 모든 화면이
처음부터 다크로 표시되고, OS 테마 설정은 무시된다. 반대 모드 플래시 없음
(FR-004·006·007, SC-001·004)

**Independent Test**: quickstart.md S1·S4·S5 — 저장값 삭제 후 접속 시 다크,
무효값 폴백, 강력 새로고침 시 깜빡임 없음

### Tests for User Story 2 (MANDATORY — constitution Principle I: TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T012 [US2] [RED] `lib/theme.test.ts`에 `THEME_INIT_SCRIPT` 실행 테스트
  추가 — `new Function(THEME_INIT_SCRIPT)()`로 jsdom에서 실행(계약 C2):
  (1) `<html data-theme="dark">` 사전 설정 + 저장값 없음 → 속성 `"dark"`
  유지; (2) 저장값 `"light"` → 속성 `"light"`로 변경; (3) 무효값
  (`"banana"`) → `"dark"` 유지; (4) localStorage 접근 예외 → throw 없이
  `"dark"` 유지. `npm test`로 "THEME_INIT_SCRIPT 부재" 이유의 실패(RED) 확인

### Implementation for User Story 2

- [X] T013 [US2] `lib/theme.ts`에 `THEME_INIT_SCRIPT` 문자열 추가 —
  research.md R2의 동기 스크립트(저장값이 정확히 `"light"`일 때만
  `document.documentElement.setAttribute("data-theme","light")`, 전체
  try/catch). T012 GREEN 확인
- [X] T014 [US2] `app/layout.tsx` 수정 — `<html lang="ko" ...>`에
  `data-theme="dark"` 기본값 + `suppressHydrationWarning` 추가, `<head>`에
  `<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />` 주입,
  `viewport.themeColor`를 `"#fbfbfa"` → `"#191919"`로 변경 (research.md
  R2·R7). 페인트 타이밍은 jsdom 검증 불가 — quickstart S1·S4로 검증,
  `npm test` green 유지 확인

**Checkpoint**: US2 독립 검증 가능 — quickstart S1·S4·S5 (로그인 화면 포함)

---

## Phase 5: User Story 3 - 선택한 모드 유지 (Priority: P3)

**Goal**: 토글로 선택한 모드가 저장되어 재방문 시 그대로 복원된다 (FR-005)

**Independent Test**: quickstart.md S3 — 라이트 전환 → 탭 닫고 재접속 →
라이트 유지, 다크로 재전환 후 반복 → 다크 유지

### Tests for User Story 3 (MANDATORY — constitution Principle I: TDD) ⚠️

> **NOTE**: US3의 저장(applyTheme)·복원(getInitialTheme/THEME_INIT_SCRIPT)
> 단위 동작은 T002·T012에서 구현됨 — 본 태스크는 두 경로의 합성(왕복)을
> 검증하는 수용 테스트다. 먼저 작성·실행해 즉시 통과하면 US1·US2 구현으로
> US3가 이미 완성된 것이므로 회귀 방지 테스트로 확정하고, 실패하면 그
> 실패를 RED 삼아 T016에서 수정한다

- [X] T015 [US3] `components/PostList.test.tsx`에 왕복(재방문 시뮬레이션)
  테스트 추가 — (1) 다크에서 토글 클릭 → localStorage `nook-theme` ===
  `"light"` 기록 확인(AS1 저장); (2) 언마운트 후 속성을 SSR 기본값
  `"dark"`로 재설정하고 `THEME_INIT_SCRIPT` 실행 → 속성 `"light"` 복원,
  재마운트한 PostList의 버튼 라벨이 `"다크 모드로 전환"`(라이트 상태)인지
  확인(AS1 복원); (3) 토글로 다크 복귀 → `"dark"` 기록, 같은 절차로 다크
  복원 확인(AS2). `npm test` 실행으로 결과 확인

### Implementation for User Story 3

- [X] T016 [US3] T015가 실패한 경우에만: `lib/theme.ts`의 `useTheme` 초기화
  경로(속성 → `getInitialTheme` 폴백 순서)를 수정해 GREEN 달성. T015가
  즉시 통과했으면 코드 변경 없이 체크만 하고 완료(추측성 수정 금지 —
  헌법 IV)

**Checkpoint**: 모든 사용자 스토리 독립 검증 가능 — quickstart S3

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 문서 동기화(헌법 II·V)와 완료 게이트

- [X] T017 `DESIGN.md` 갱신 — 구현과 같은 작업 단위(헌법 V):
  §2에 다크 모드 토큰 표 신설(research.md R4 19개 + 신규 토큰 3개의
  라이트/다크 값, `html[data-theme="dark"]` 메커니즘, 토큰 수 100 → 103
  반영), §2.6에 다크 스크롤바 규칙·themeColor `#191919`·FOUC 스크립트,
  §4.2 PostList 헤더에 토글 버튼 명세(C4 값), §4.3·4.1·4.6의 리터럴 →
  토큰 치환 반영(`--surface-overlay`·`--tile-blue-text`·`--danger-subtle`),
  §4.7 아이콘 표에 SunIcon·MoonIcon 추가, §5-8 저장 키에 `nook-theme` 추가,
  §6 "현재 미구현"에서 다크 모드 항목 제거. `app/globals.css` 값과 1:1
  문자 그대로 대조
- [X] T018 `specs/002-dark-mode/quickstart.md` S1~S6 수동 검증 수행
  (`npm run dev`) — 특히 S4 깜빡임, S6 다크 가독성(선택 행·아바타 이니셜·
  삭제 hover·글자 수 배지·스크롤바). 발견 사항은 수정 후 재검증
- [X] T019 완료 게이트 점검(헌법 "개발 워크플로 및 품질 게이트") —
  전체 `npm test` 통과·출력 무결(에러·경고 0), 모든 신규 동작에 테스트
  존재 + RED 확인 이력, 모킹 없이 실제 코드 사용, 엣지 케이스(무효 저장값·
  storage 예외) 커버, DESIGN.md 동기화 완료를 최종 확인

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존성 없음 — 즉시 시작
- **Foundational (Phase 2)**: T001 완료 후. T002(RED) → T003(GREEN) 순서
  엄수; T004는 T003과 독립이지만 T005~T007보다 먼저(토큰 정의가 참조보다
  선행); T005·T006·T007은 T004 완료 후 병렬 [P]
- **US1 (Phase 3)**: Foundational 완료 후. T008(RED) → T009·T010 → T011(GREEN).
  T009는 T008과 병렬 가능 [P](다른 파일, 테스트 대상 아님)
- **US2 (Phase 4)**: Foundational 완료 후 (US1과 파일 겹침: lib/theme.ts·
  lib/theme.test.ts — 순차 실행 권장). T012(RED) → T013(GREEN) → T014
- **US3 (Phase 5)**: US1·US2 완료 후 (두 스토리의 합성을 검증). T015 → T016
- **Polish (Phase 6)**: 모든 스토리 완료 후. T017·T018 병렬 가능, T019는 마지막

### User Story Dependencies

- **US1 (P1)**: Foundational만 필요 — 다른 스토리 의존 없음 (MVP)
- **US2 (P2)**: Foundational만 필요 — US1과 독립적으로 테스트 가능
  (lib/theme.ts 파일 공유로 작업 순서만 조정)
- **US3 (P3)**: US1(저장 경로)·US2(복원 경로)의 합성 검증 — 두 스토리 완료 후

### Within Each User Story

- 테스트 작성 → `npm test`로 RED 확인 → 최소 구현 → GREEN 확인 → 리팩터
  (헌법 I Red-Green-Refactor)
- 각 태스크(또는 논리 그룹) 완료 시 커밋

### Parallel Opportunities

- Phase 2: T005, T006, T007 (서로 다른 파일의 동일 패턴 리팩터)
- Phase 3: T008 작성과 T009 아이콘 추가 (다른 파일, 상호 독립)
- Phase 6: T017 문서와 T018 수동 검증

---

## Parallel Example: Foundational (Phase 2, T004 완료 후)

```bash
# 서로 다른 파일의 리터럴 → 토큰 치환을 병렬로:
Task: "components/Editor.tsx — overlay·danger-subtle·tile-blue-text 치환"
Task: "components/IconRail.tsx — tile-blue-text 치환"
Task: "app/(app)/mypage/page.tsx — tile-blue-text 치환"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (기준선) → Phase 2 (Foundational: 테마 코어 + 다크 토큰)
2. Phase 3 (US1 토글) 완료 → **STOP & VALIDATE**: quickstart S2로 독립 검증
3. 이 시점에서 토글로 다크/라이트 전환이 완전 동작 (기본값·영속은 미완) — 데모 가능

### Incremental Delivery

1. Setup + Foundational → 기반 완성
2. US1 토글 → 독립 검증 → MVP!
3. US2 기본 다크 + 무플래시 → 독립 검증 (SC-001·004 충족)
4. US3 선택 유지 → 독립 검증 (SC-003 충족)
5. Polish (DESIGN.md 동기화 + 수동 검증 + 완료 게이트) → 기능 완료

### 주의사항

- lib/theme.ts와 lib/theme.test.ts는 US1·US2가 공유 — 두 스토리를 병렬로
  진행하지 말 것 (단일 세션 순차 진행 권장)
- CSS 값은 반드시 research.md R4·R5 표를 문자 그대로 사용 — 임의 값 금지
  (헌법 II)
- 토글 버튼 라벨은 "전환될 모드" 기준("라이트 모드로 전환" = 현재 다크) —
  계약 C4와 테스트가 이 규칙으로 작성됨

---

## Notes

- [P] tasks = 다른 파일, 미완료 태스크에 대한 의존 없음
- [RED] 표시 태스크는 반드시 `npm test`로 "올바른 이유의 실패"를 확인하고
  기록한 뒤 다음 태스크로 진행 (헌법 I Verify RED)
- 각 체크포인트에서 중단하고 스토리를 독립 검증할 수 있음
- 총 19개 태스크: Setup 1 / Foundational 6 / US1 4 / US2 3 / US3 2 / Polish 3
