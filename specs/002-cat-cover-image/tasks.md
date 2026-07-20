# Tasks: 랜덤 고양이 커버 이미지

**Input**: Design documents from `/specs/002-cat-cover-image/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are MANDATORY per constitution Principle I (TDD — superpowers `/test-driven-development`). 모든 [RED] 태스크는 `npm test`로 "기능 부재"라는 올바른 이유의 실패를 직접 확인한 뒤에만 다음으로 진행한다. 모든 [GREEN] 태스크는 새 테스트·기존 테스트 전체 통과와 무결한 출력(에러·경고 없음)을 확인한다.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Next.js 단일 앱 (plan.md 구조): `components/`, `lib/`, `app/` at repository root, 테스트는 소스 옆 콜로케이션(`*.test.ts(x)`).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 변경 전 기준선 확보

- [ ] T001 `npm test`를 실행해 기존 테스트 전체가 통과하고 출력이 무결함을 확인한다 (기준선 — 이후 모든 RED 판정의 비교 기준)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 기존 그라데이션 커버 제거(FR-010)와 공용 헬퍼 — 모든 유저 스토리가 이 위에서 구현된다

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 [RED] `components/Editor.test.tsx`에서 픽스처의 `cover: null`을 제거하고, `커버 추가`·`커버 변경` 버튼이 화면에 존재하지 않음을 단언하는 테스트를 추가한다. `npm test` 실행 — 버튼이 아직 존재하므로 실패하는 것을 확인 (계약: contracts/cat-cover-ui.md §3)
- [ ] T003 [GREEN] `components/Editor.tsx`에서 기존 커버 UI 전부 제거 — 커버 밴드(`active.cover` 분기), 커버 피커 팝오버, `coverOpen` 상태, `🖼 커버 추가` 버튼, `coverBtnStyle`, `COVERS`/`CoverKey` import, `patch({ cover })` 호출. 이모지 `marginTop`은 임시로 `12px` 고정. `npm test` 통과 확인
- [ ] T004 [P] [RED] `lib/data.test.ts`에 `makeSeed()`가 반환하는 모든 글에 `cover` 속성이 없음을 단언하는 테스트를 추가한다. `npm test` 실행 — 시드 p1이 `cover: "blue"`를 가지므로 실패하는 것을 확인
- [ ] T005 [GREEN] `lib/data.ts`에서 `CoverKey` 타입·`COVERS` 상수·`Post.cover` 필드·시드의 `cover` 값 제거, `lib/store.tsx`에서 새 글 생성 객체의 `cover: null` 제거. `npm test` 전체 통과 + 무결 출력 확인 (data-model.md §1, research.md R7)
- [ ] T006 [P] [RED] `lib/catCover.test.ts` 신규 작성 — `CAT_API_URL === "https://cataas.com/api/cats?tags=cute"` 단언, `pickRandomCatUrl` 계약 테스트(배열 아님 → null, 빈 배열 → null, `id`가 비문자열/빈 문자열인 항목 제외, 유효 항목 시 `https://cataas.com/cat/{id}` 형식 반환). `npm test` 실행 — 모듈 부재로 실패 확인 (계약: contracts/cat-cover-ui.md §1)
- [ ] T007 [GREEN] `lib/catCover.ts` 신규 작성 — `CAT_API_URL` 상수, `CatItem` 인터페이스(실측 구조: id/tags/mimetype/createdAt), `pickRandomCatUrl(items: unknown): string | null` 최소 구현. `npm test` 통과 확인

**Checkpoint**: 기존 커버 완전 제거 + 헬퍼 준비 완료 — 유저 스토리 구현 시작 가능

---

## Phase 3: User Story 1 - 글을 열면 커버 이미지가 보인다 (Priority: P1) 🎯 MVP

**Goal**: 글을 열거나 전환하면 제목 위 전체 폭 밴드(150px)에 랜덤 고양이 사진이 표시된다 (FR-001~003)

**Independent Test**: 글을 열어 제목 위에 고양이 사진이 보이고, 다른 글로 전환하면 새로 불러오는지 확인 (quickstart.md 시나리오 A)

### Tests for User Story 1 (MANDATORY — constitution Principle I: TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T008 [RED] [US1] `components/CatCover.test.tsx` 신규 작성 — 모의 fetch(`vi.stubGlobal`, contracts/cataas-api.md의 실측 응답 구조 전체 사용)로 (1) 렌더 후 `getByRole("img", { name: "랜덤 고양이 커버" })`가 나타나고 `src`가 `https://cataas.com/cat/{모의 id}` 형식임을 단언, (2) `postId` prop 변경 시 fetch가 다시 호출됨을 단언. jsdom에서 `<img>` `onLoad`는 자동 발화하지 않으므로 `fireEvent.load(img)`로 트리거. `npm test` 실행 — 컴포넌트 부재로 실패 확인
- [ ] T009 [RED] [US1] `components/Editor.test.tsx`에 통합 테스트 추가 — 에디터 렌더 시 커버 영역(이미지 alt "랜덤 고양이 커버")이 존재하고 이모지 `marginTop`이 `-44px`(겹침)임을 단언(fetch 모킹 포함). `npm test` 실행 — CatCover 미장착으로 실패 확인

### Implementation for User Story 1

- [ ] T010 [GREEN] [US1] `components/CatCover.tsx` 신규 작성 — 최소 구현: `postId` 변경 시 `fetch(CAT_API_URL)` → `pickRandomCatUrl` → 전체 폭 × 150px 밴드에 `<img alt="랜덤 고양이 커버" style="width:100%; height:150px; object-fit:cover; display:block">` 렌더 (계약: contracts/cat-cover-ui.md §2 ready 상태). T008만 통과시키는 범위로 구현, `npm test` 통과 확인
- [ ] T011 [GREEN] [US1] `components/Editor.tsx` 스크롤 영역 최상단(본문 컬럼 밖, 기존 커버 밴드 자리)에 `<CatCover postId={active.id} />` 장착, 이모지 `marginTop`을 `-44px`로 변경 (DESIGN.md §4.3 겹침 값). `npm test` 전체 통과 + 무결 출력 확인

**Checkpoint**: MVP 완성 — `npm run dev`로 quickstart.md 시나리오 A 수동 확인 가능

---

## Phase 4: User Story 2 - 로딩 중에는 스켈레톤 UI가 보인다 (Priority: P2)

**Goal**: 이미지가 준비될 때까지 커버 자리에 같은 크기의 스켈레톤(스피너 금지)이 표시되고, 교체 시 레이아웃 이동이 없으며, 빠른 글 전환 시 이전 요청이 새 커버를 덮어쓰지 않는다 (FR-004, FR-005, FR-008)

**Independent Test**: 네트워크 스로틀링 상태에서 글을 열어 스켈레톤 → 이미지 교체와 제목 위치 불변을 확인 (quickstart.md 시나리오 B, D)

### Tests for User Story 2 (MANDATORY — constitution Principle I: TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T012 [RED] [US2] `components/CatCover.test.tsx`에 스켈레톤 테스트 추가 — (1) fetch 응답 전 `getByRole("status", { name: "커버 이미지 불러오는 중" })` 존재, (2) fetch 응답 후에도 `fireEvent.load(img)` 전까지 스켈레톤 유지, (3) load 후 스켈레톤 사라짐, (4) 로딩 중 progressbar 역할(스피너) 요소 부재, (5) 스켈레톤 컨테이너 밴드가 `height: 150px` 유지. `npm test` 실행 — 스켈레톤 미구현으로 실패 확인
- [ ] T013 [RED] [US2] `components/CatCover.test.tsx`에 레이스 테스트 추가 — 첫 요청이 지연되는 중 `postId`를 바꿔 두 번째 요청이 먼저 완료된 상황을 모의(지연 Promise 2개)한 뒤, 최종 이미지 `src`가 마지막 글의 응답이며 이전 응답이 화면을 덮어쓰지 않음을 단언. `npm test` 실행 — abort 미구현으로 실패 확인

### Implementation for User Story 2

- [ ] T014 [GREEN] [US2] `components/CatCover.tsx`에 스켈레톤 구현 — 밴드(`position: relative; height: 150px`) 안에 `role="status" aria-label="커버 이미지 불러오는 중"` 오버레이(`position: absolute; inset: 0; background: var(--surface-hover); animation: nk-skeleton-pulse 1.2s ease-in-out infinite alternate`), 상태 머신 `loading → ready`(img `onLoad` 게이팅). T012만 통과시키는 범위로 구현, `npm test` 통과 확인 (계약: contracts/cat-cover-ui.md §2 loading 상태)
- [ ] T015 [GREEN] [US2] `components/CatCover.tsx`에 `AbortController` 도입 — `useEffect(…, [postId])` cleanup에서 `abort()`, 상태 갱신 전 `signal.aborted` 확인, `AbortError`는 무시. `npm test` 전체 통과 확인 (research.md R5)
- [ ] T016 [US2] `app/globals.css`에 `@keyframes nk-skeleton-pulse { from { opacity: 1 } to { opacity: 0.55 } }` 추가 (jsdom으로 검증 불가한 스타일 — quickstart.md 시나리오 B에서 수동 검증. 기존 `prefers-reduced-motion` 전역 규칙이 자동 적용됨, research.md R4)

**Checkpoint**: US1 + US2 동작 — 스로틀링으로 시나리오 B, D 수동 확인 가능

---

## Phase 5: User Story 3 - 불러오기 실패 시에도 편집은 정상 동작한다 (Priority: P3)

**Goal**: 모든 실패 모드(네트워크 오류, HTTP 오류, 빈 결과, 이미지 로드 실패)에서 커버 영역이 조용히 사라지고 편집이 방해받지 않는다 (FR-006, FR-007은 기존 구조로 충족)

**Independent Test**: 오프라인 상태에서 글을 열어 커버가 숨겨지고 제목·본문 편집이 정상인지 확인 (quickstart.md 시나리오 C)

### Tests for User Story 3 (MANDATORY — constitution Principle I: TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T017 [RED] [US3] `components/CatCover.test.tsx`에 실패 테스트 추가 — 4종 각각에서 (a) 스켈레톤·이미지가 모두 렌더되지 않고(`queryByRole` null) (b) `onVisibilityChange(false)`가 호출됨을 단언: (1) fetch reject, (2) `response.ok === false`, (3) 빈 배열 응답, (4) `fireEvent.error(img)`. 추가로 abort에 의한 `AbortError`는 `onVisibilityChange(false)`를 호출하지 **않음**을 단언. `npm test` 실행 — error 상태 미구현으로 실패 확인 (계약: contracts/cataas-api.md §3)
- [ ] T018 [RED] [US3] `components/Editor.test.tsx`에 실패 통합 테스트 추가 — fetch가 실패해도 (1) 제목 입력에 타이핑이 정상 반영되고 (2) 이모지 `marginTop`이 `12px`로 전환됨을 단언. `npm test` 실행 — 마진 연동 미구현으로 실패 확인

### Implementation for User Story 3

- [ ] T019 [GREEN] [US3] `components/CatCover.tsx`에 `error` 상태 완성 — 모든 실패 모드에서 `null` 렌더, `onVisibilityChange?: (visible: boolean) => void` prop 추가(ready/loading = true, error = false, AbortError 제외). `npm test` 통과 확인 (data-model.md §3 상태 머신)
- [ ] T020 [GREEN] [US3] `components/Editor.tsx`에 `coverVisible` 상태 추가 — 초기값 `true`, 글 전환 시 `true` 리셋, `onVisibilityChange`로 갱신, 이모지 `marginTop`을 `coverVisible ? -44 : 12`로 연동. `npm test` 전체 통과 + 무결 출력 확인

**Checkpoint**: 세 스토리 모두 독립 동작 — 시나리오 C 수동 확인 가능

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 리팩터·문서 동기화·완료 게이트

- [ ] T021 [REFACTOR] 테스트 GREEN을 유지하며 `components/CatCover.tsx`·`components/Editor.tsx` 중복 제거·이름 정리 (동작 추가 금지, 헌법 원칙 I REFACTOR 단계)
- [ ] T022 [P] `DESIGN.md` 동기화 (헌법 원칙 V) — §4.3 커버 섹션을 고양이 커버·스켈레톤 명세로 교체(150px 밴드, `--surface-hover`, role/aria 문자열, 이모지 마진 -44/12 규칙, 실패 시 숨김), §2.5에 `nk-skeleton-pulse` keyframes 기록("애니메이션 없음" 문구 갱신), §5 플로우의 "커버" 편집 항목 갱신, §4.3 글자 수 배지 등 무관 섹션은 유지
- [ ] T023 완료 게이트: `npm test` 전체 실행 — 통과 + 무결 출력(에러·경고 0) 확인, 헌법 "개발 워크플로 및 품질 게이트" 체크리스트 전 항목 자가 점검
- [ ] T024 `npm run dev`로 quickstart.md 수동 시나리오 A~E 실행 및 결과 기록 (SC-001~004 검증)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존성 없음 — 즉시 시작
- **Foundational (Phase 2)**: T001 이후. 모든 유저 스토리를 차단
  - T002 → T003 → T005 순서 필수 (Editor의 `COVERS` 참조 제거(T003) 전에 타입 삭제(T005) 불가)
  - T004는 T002와 병렬 가능, T005는 T003·T004 이후
  - T006 → T007은 독립 파일이라 T002~T005와 병렬 가능
- **US1 (Phase 3)**: Foundational 완료 후. T008·T009(RED) → T010 → T011(GREEN)
- **US2 (Phase 4)**: US1 완료 후 (CatCover 존재 전제). T012·T013(RED) → T014 → T015(GREEN), T016은 T014 이후 아무 때나
- **US3 (Phase 5)**: US1 완료 후 (US2와 독립적으로 시작 가능하나 같은 파일을 수정하므로 순차 권장). T017·T018(RED) → T019 → T020(GREEN)
- **Polish (Phase 6)**: 모든 스토리 완료 후. T022는 T021과 병렬 가능

### Within Each User Story

- 테스트(RED)를 먼저 작성하고 실패를 확인한 뒤에만 구현(GREEN) 시작 (헌법 원칙 I — 생략 불가)
- GREEN은 해당 RED 테스트만 통과시키는 최소 구현
- 같은 파일(`CatCover.tsx`, `CatCover.test.tsx`)을 여러 스토리가 수정하므로 스토리 간 순차 진행

### Parallel Opportunities

- Phase 2: `T004`(data.test)·`T006`(catCover.test)은 서로 다른 파일의 RED 테스트로 `T002`와 병렬 작성 가능; `T006→T007` 헬퍼 쌍은 Editor 정리(T002~T005)와 완전 병렬
- Phase 3: `T008`·`T009`는 서로 다른 테스트 파일 — 병렬 작성 가능
- Phase 6: `T022`(DESIGN.md)는 코드 리팩터 `T021`과 병렬 가능

## Parallel Example: Foundational

```bash
# 서로 다른 파일의 RED 테스트를 동시에 작성 (각각 npm test로 실패 확인):
Task: "T002 Editor.test.tsx — 기존 커버 버튼 부재 단언 (실패 확인)"
Task: "T004 lib/data.test.ts — 시드에 cover 속성 없음 단언 (실패 확인)"
Task: "T006 lib/catCover.test.ts — pickRandomCatUrl 계약 (실패 확인)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1(기준선) → Phase 2(기존 커버 제거 + 헬퍼) 완료
2. Phase 3(US1) 완료 — 글을 열면 고양이 커버 표시
3. **STOP and VALIDATE**: quickstart.md 시나리오 A 수동 확인
4. 이 시점의 로딩 상태는 빈 밴드(스켈레톤은 US2에서 추가) — 데모 가능한 MVP

### Incremental Delivery

1. Setup + Foundational → 기존 커버가 사라진 깨끗한 기반
2. US1 → 커버 표시 (MVP!) → 시나리오 A
3. US2 → 스켈레톤 + 레이스 방지 → 시나리오 B, D
4. US3 → 실패 내성 → 시나리오 C
5. Polish → DESIGN.md 동기화 + 완료 게이트 (T023·T024)

---

## Notes

- [P] tasks = different files, no dependencies
- 모든 [RED]는 "기능 부재"로 실패해야 한다 — 오타·import 오류로 실패하면 테스트를 고쳐 올바른 실패를 만든 뒤 진행
- fetch 모킹은 외부 경계 1곳으로 한정하고 모의 응답은 contracts/cataas-api.md의 실측 구조 전체를 사용 (부분 모킹 금지 — 헌법 원칙 I)
- 태스크 또는 논리 그룹 완료마다 커밋 권장 (T003+T005처럼 컴파일이 함께 돌아오는 단위)
- 각 Checkpoint에서 멈춰 해당 스토리를 독립 검증할 수 있다
