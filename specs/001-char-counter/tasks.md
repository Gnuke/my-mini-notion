# Tasks: 본문 글자 수 카운터

**Input**: Design documents from `/specs/001-char-counter/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/char-counter-ui.md, quickstart.md

**Tests**: Tests are MANDATORY per constitution Principle I (TDD — superpowers `/test-driven-development`). Every user story MUST include test tasks placed and executed BEFORE its implementation tasks, and each test MUST be verified to fail before implementing.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

기존 Next.js 단일 앱 구조 (plan.md 기준): 계산 로직 `lib/`, UI `components/`,
테스트는 소스 옆 콜로케이션 (`*.test.ts` / `*.test.tsx`). 실행 명령: `npm test`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 그린 기준선 확보 — 기존 테스트가 모두 통과하는 상태에서 시작한다

- [X] T001 `npm test` 실행 — 기존 테스트(`lib/data.test.ts`, `test/harness.test.tsx`) 전체 통과·출력 무결(에러·경고 없음) 확인. 실패 시 이 기능 작업 전에 사용자에게 보고

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 없음 — 이 기능은 기존 인프라(Vitest 4 + RTL + jsdom, `lib/store.tsx`
스토어, `Post` 모델)로 충분하다. 신규 의존성·스키마·설정 변경이 없다 (plan.md
Technical Context). 바로 사용자 스토리 단계로 진행한다.

**Checkpoint**: T001 통과 즉시 사용자 스토리 시작 가능

---

## Phase 3: User Story 1 - 입력 중 실시간 글자 수 확인 (Priority: P1) 🎯 MVP

**Goal**: 글 본문에 입력·삭제·붙여넣기하면 에디터 우측 하단 고정 배지에 글자
수가 `{N}자` 형식으로 실시간 표시된다 (제목은 계산 제외).

**Independent Test**: 글을 하나 열고 본문에 텍스트를 입력·삭제하면서 우측 하단
배지가 올바른 글자 수로 즉시 갱신되는지 확인 (quickstart.md 시나리오 1~5).

### Tests for User Story 1 (MANDATORY — constitution Principle I: TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T002 [P] [US1] `lib/chars.test.ts` 작성 — `countChars` 단위 테스트.
      계약 C2 전 케이스: `""`→0, `"안녕하세요"`→5, `"a b"`→3, `"가\n나"`→3,
      `"😀"`→1, `"👨‍👩‍👧"`→1(조합 이모지), `"🇰🇷"`→1(국기).
      **Verify RED**: `npm test` 실행해 `lib/chars.ts` 모듈 부재라는 올바른
      이유로 실패하는 것을 확인
- [X] T003 [P] [US1] `components/Editor.test.tsx` 작성 — US1 수용 시나리오
      테스트. 렌더 방식: localStorage(`mini-nook-v1`)에 본문을 아는 글 1개를
      시드한 뒤 `<NookProvider><Editor /></NookProvider>` 렌더 (실제 스토어
      사용, 모킹 없음 — 헌법 모킹 규칙). 케이스: ① 본문 빈 글 열림 → `0자`
      표시 ② userEvent로 본문에 `안녕하세요` 입력 → `5자`로 갱신 ③ 일부 삭제 →
      감소한 값 표시 ④ **제목** input에 입력 → 글자 수 불변 (계약 C1·C2·C3).
      **Verify RED**: 배지 부재라는 올바른 이유로 실패하는 것을 확인

### Implementation for User Story 1

- [X] T004 [US1] `lib/chars.ts` 구현 — 모듈 스코프에 `Intl.Segmenter("ko",
      { granularity: "grapheme" })` 1회 생성, `countChars(text: string): number`
      순수 함수 (research R1). T002를 통과시키는 최소 구현만.
      **Verify GREEN**: `npm test` 전체 통과·출력 무결 확인
- [X] T005 [US1] `components/Editor.tsx` 수정 — ① 루트 div에 `position:
      "relative"` 추가 ② `useMemo(() => countChars(active.body),
      [active.body])`로 계산 ③ 우측 하단 배지 렌더: `position: absolute;
      right: 18px; bottom: 12px; background: rgba(255,255,255,.92); border:
      1px solid var(--border-subtle); border-radius: var(--radius-sm);
      padding: 4px 9px; font-size: 12px; color: var(--text-tertiary);
      pointer-events: none; user-select: none`, 텍스트 `` `${count}자` ``
      (research R3 — 기존 토큰·coverBtnStyle 선례만 사용, z-index 미지정).
      T003을 통과시키는 최소 구현만. **Verify GREEN**: `npm test` 전체
      통과·출력 무결 확인
- [X] T006 [US1] REFACTOR — 그린 유지하며 중복 제거·이름 정리만 수행
      (`lib/chars.ts`, `components/Editor.tsx`, 테스트 헬퍼). 동작 추가 금지.
      완료 후 `npm test` 재확인

**Checkpoint**: US1 완결 — 글자 수 카운터 MVP가 단독으로 동작·검증 가능

---

## Phase 4: User Story 2 - 글 전환 시 글자 수 갱신 (Priority: P2)

**Goal**: 다른 글로 전환하면 배지가 새로 열린 글의 본문 기준 값으로 즉시 바뀐다.

**Independent Test**: 본문 길이가 다른 글 2개를 시드하고 전환할 때마다 배지가
각 글의 글자 수와 일치하는지 확인 (quickstart.md 시나리오 7).

### Tests for User Story 2 (MANDATORY — constitution Principle I: TDD) ⚠️

> **NOTE: Write this test FIRST and run it.** US1의 파생 렌더링 구현이 글
> 전환을 이미 충족해 **즉시 통과할 수 있다** — 그 경우 새 동작이 아니라 스펙
> 수용 기준의 회귀 방지 테스트로 유지하고, T008은 "변경 불필요"로 기록하고
> 건너뛴다. 실패하면 정상 RED이므로 T008로 진행한다.

- [X] T007 [US2] `components/Editor.test.tsx`에 글 전환 테스트 추가 — 본문
      `"가나다"`(3자)인 글 A와 빈 글 B를 localStorage에 시드, 테스트 보조
      컴포넌트에서 `useNook().select`로 A→B 전환 시 배지가 `3자`→`0자`로
      바뀌는지 검증 (계약 C3, FR-008). 실행해 통과/실패 여부와 이유 확인

### Implementation for User Story 2

- [X] T008 [US2] T007이 실패한 경우에만: `components/Editor.tsx`의 계산·렌더가
      글 전환(`active` 교체)을 반영하도록 원인 수정 후 **Verify GREEN**.
      T007이 즉시 통과했다면 이 태스크는 "변경 불필요"로 완료 처리

**Checkpoint**: US1 + US2 — 여러 글을 오가도 배지 신뢰 가능

---

## Phase 5: User Story 3 - 글이 선택되지 않은 상태에서는 표시하지 않음 (Priority: P3)

**Goal**: 선택된 글이 없는 빈 상태 화면에서는 배지가 DOM에 존재하지 않는다.

**Independent Test**: 선택 글이 없는 상태를 만들고 배지가 화면에 없는지 확인
(quickstart.md 시나리오 8).

### Tests for User Story 3 (MANDATORY — constitution Principle I: TDD) ⚠️

> **NOTE: Write this test FIRST and run it.** 배지는 Editor 내부에 있고
> Editor는 `active == null`이면 `null`을 반환하므로(components/Editor.tsx:43)
> **즉시 통과할 수 있다** — 그 경우 회귀 방지 테스트로 유지하고 T010은 "변경
> 불필요"로 기록하고 건너뛴다.

- [X] T009 [US3] `components/Editor.test.tsx`에 빈 상태 테스트 추가 —
      localStorage에 글은 있으나 `selectedId`가 존재하지 않는 id를 가리키게
      시드(→ `active == null`), Editor 렌더 결과에 `/자$/` 텍스트가 없는지
      검증 (계약 C1, FR-007). 실행해 통과/실패 여부와 이유 확인

### Implementation for User Story 3

- [X] T010 [US3] T009가 실패한 경우에만: 배지 렌더 조건을 수정해 글 미선택 시
      렌더되지 않도록 수정 후 **Verify GREEN**. 즉시 통과했다면 "변경 불필요"로
      완료 처리

**Checkpoint**: 세 스토리 모두 단독 검증 가능

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 문서 동기화(원칙 V)와 완료 게이트 검증

- [X] T011 [P] `DESIGN.md` §4.3(Editor)에 글자 수 배지 명세 추가 — 위치
      (에디터 루트 기준 absolute, right 18 / bottom 12), 스타일(배경
      `rgba(255,255,255,.92)`, 보더 `--border-subtle`, radius `--radius-sm`,
      패딩 4px 9px, 폰트 12px, 색 `--text-tertiary`, pointer-events none),
      형식(`{N}자`), 가시성 규칙(글 미선택 시 없음). 구현과 같은 작업 단위로
      커밋 (원칙 V)
- [X] T012 quickstart.md 수동 검증 수행 — `npm run dev`로 시나리오 1~10 전부
      확인. 특히 ⑥ 스크롤 시 고정(FR-003), ⑨ 이모지 계산, ⑩ 수만 자 입력
      반응성(SC-003). 결과를 사용자에게 보고
- [X] T013 완료 게이트 최종 확인 — `npm test` 전체 통과·출력 무결, 모든 신규
      동작에 테스트 존재, 각 테스트의 RED(또는 즉시 통과 사유) 확인 기록,
      DESIGN.md 갱신 완료 (헌법 "개발 워크플로 및 품질 게이트" 체크리스트)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존성 없음 — 즉시 시작
- **Foundational (Phase 2)**: 태스크 없음 (기존 인프라로 충분)
- **User Stories (Phase 3~5)**: T001 통과 후 시작. US1이 배지 자체를
  구현하므로 US2·US3의 **테스트 실행**은 US1 완료 후가 의미 있다
  (테스트 작성 자체는 먼저 가능)
- **Polish (Phase 6)**: 모든 스토리 완료 후

### User Story Dependencies

- **US1 (P1)**: 다른 스토리 의존 없음 — MVP
- **US2 (P2)**: 배지가 존재해야 검증 가능 → US1 완료 후 실행. 추가 구현은
  조건부(T008)
- **US3 (P3)**: 배지가 존재해야 검증이 의미 있음 → US1 완료 후 실행. 추가
  구현은 조건부(T010)

### Within Each User Story

- 테스트 작성·RED 확인(또는 즉시 통과 사유 기록) → 최소 구현 → GREEN 확인 →
  리팩터 (constitution Principle I)
- 순수 함수(lib) → UI(components) 순서 (T004 → T005: T005가 T004의
  `countChars`를 import)

### Parallel Opportunities

- **T002 ∥ T003**: 서로 다른 파일의 테스트 작성 — 동시 진행 가능
- **T011 ∥ T012**: DESIGN.md 문서화와 수동 검증 — 파일 충돌 없음
- T007·T009는 같은 파일(`components/Editor.test.tsx`)을 수정하므로 순차 처리

---

## Parallel Example: User Story 1

```bash
# 테스트 2건을 동시에 작성한 뒤, 각각 RED를 확인:
Task: "countChars 단위 테스트 작성 in lib/chars.test.ts"        # T002
Task: "카운터 UI 동작 테스트 작성 in components/Editor.test.tsx"  # T003

# RED 확인 후 구현은 순차 (T005가 T004에 의존):
Task: "countChars 구현 in lib/chars.ts"                         # T004
Task: "우측 하단 배지 렌더 in components/Editor.tsx"              # T005
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (T001) — 그린 기준선
2. Phase 3 (T002~T006) — US1 완성
3. **STOP and VALIDATE**: quickstart 시나리오 1~5로 US1 단독 검증
4. 이 시점에서 이미 사용자 가치 완결 (배지 표시 + 실시간 갱신)

### Incremental Delivery

1. US1 → 단독 검증 → MVP 배포 가능
2. US2 (T007~T008) → 글 전환 신뢰성 확보
3. US3 (T009~T010) → 빈 상태 정합성 확보
4. Polish (T011~T013) → 문서 동기화 + 완료 게이트

### 유의 사항 (이 기능 고유)

- US2·US3은 US1의 파생 렌더링 구조가 이미 충족할 가능성이 높다 — 테스트가
  즉시 통과하면 그 사유를 기록하고 회귀 테스트로 유지한다 (억지로 RED를
  만들기 위해 구현을 훼손하지 않는다)
- 스크롤 고정(FR-003)과 수만 자 성능(SC-003)은 jsdom으로 검증이 어려우므로
  T012 수동 검증이 필수 게이트다

---

## Notes

- [P] tasks = 서로 다른 파일, 의존성 없음
- [Story] 라벨로 태스크 ↔ 스토리 추적
- 각 태스크(또는 논리 그룹) 완료 후 커밋
- 금지: 테스트 없는 프로덕션 코드, 테스트보다 먼저 작성된 구현, 임의 스타일 값
