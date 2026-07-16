# Tasks: 사이드바 접기/펼치기

**Input**: Design documents from `/specs/002-sidebar-collapse/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/sidebar-collapse-ui.md, quickstart.md

**Tests**: Tests are MANDATORY per constitution Principle I (TDD — superpowers `/test-driven-development`). Every user story MUST include test tasks placed and executed BEFORE its implementation tasks, and each test MUST be verified to fail before implementing.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

기존 Next.js 단일 앱 구조 (plan.md 기준): UI `components/`·`app/(app)/`,
테스트는 소스 옆 콜로케이션 (`*.test.tsx`). 실행 명령: `npm test`.
`next/navigation` 훅만 `vi.mock` 허용(research R7 — 불가피한 최소 모킹),
스토어는 실제 `NookProvider` + jsdom localStorage 시드 사용.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 그린 기준선 확보 — 기존 테스트가 모두 통과하는 상태에서 시작한다

- [X] T001 `npm test` 실행 — 기존 테스트 전체 통과·출력 무결(에러·경고 없음)
      확인. 실패 시 이 기능 작업 전에 사용자에게 보고

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 없음 — 이 기능은 기존 인프라(Vitest 4 + RTL + jsdom,
`lib/store.tsx` 스토어, IconRail/PostList 컴포넌트)로 충분하다. 신규 의존성·
스키마·설정 변경이 없다 (plan.md Technical Context). 레일 렌더 위치 이동
(research R1)은 US1 테스트가 요구하는 동작 변경의 일부이므로 US1 구현
태스크에 포함한다.

**Checkpoint**: T001 통과 즉시 사용자 스토리 시작 가능

---

## Phase 3: User Story 1 - 버튼 클릭으로 사이드바 접기/펼치기 (Priority: P1) 🎯 MVP

**Goal**: 업무 화면에서 토글 버튼 클릭으로 사이드바 전체(레일+글 목록)가
접혀 60px 스트립만 남고, 다시 클릭하면 펼쳐진다. 기본은 펼침(FR-008),
마이 페이지는 토글 없이 레일 항상 표시(FR-009).

**Independent Test**: 업무 화면에서 토글 버튼을 클릭해 접힘/펼침이 정확히
번갈아 전환되고, 접힌 동안 스트립 안 버튼이 계속 보이는지 확인
(quickstart.md 시나리오 1·2·6·8).

### Tests for User Story 1 (MANDATORY — constitution Principle I: TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T002 [P] [US1] `components/IconRail.test.tsx` 작성 — `next/navigation`을
      `vi.mock`(useRouter/usePathname 대체), `<NookProvider>`로 감싸 렌더.
      케이스: ① 프롭 없이 렌더 → "사이드바 접기"·"사이드바 펼치기" 버튼이
      없고 기존 요소(홈·새 글·마이 페이지)는 렌더됨 (FR-009 근거)
      ② `onToggleSidebar` 전달 → aria-label "사이드바 접기" 버튼이 렌더되고
      클릭 시 콜백 1회 호출 ③ `collapsed=true` + `onToggleSidebar` →
      aria-label "사이드바 펼치기" 버튼만 남고 워크스페이스 타일·홈·새 글·
      아바타는 렌더되지 않음 (계약 §1·§3).
      **Verify RED**: `npm test` 실행 — IconRail이 프롭을 지원하지 않아
      실패하는 것을 확인
- [X] T003 [P] [US1] `app/(app)/page.test.tsx` 작성 — localStorage
      (`mini-nook-v1`)에 글 시드 후 `<NookProvider><WorkspacePage /></NookProvider>`
      렌더, `next/navigation` `vi.mock`. 케이스: ① 기본 펼침 — "내 글" 목록
      패널과 "사이드바 접기" 버튼이 보임 (FR-008) ② "사이드바 접기" 클릭 →
      글 목록이 보이지 않고(not visible) "사이드바 펼치기" 버튼이 보임
      (US1-1·US1-3) ③ "사이드바 펼치기" 클릭 → 글 목록이 다시 보임 (US1-2)
      ④ 토글 5회 연타 → 홀수 회 접힘·짝수 회 펼침 상태 정확 (US1-4).
      **Verify RED**: WorkspacePage에 토글이 없어 실패하는 것을 확인
- [X] T004 [P] [US1] `app/(app)/mypage/page.test.tsx` 작성 — `next/navigation`
      `vi.mock`, `<NookProvider><MyPage /></NookProvider>` 렌더. 케이스:
      ① `aria-label="주요 탐색"` 레일(nav)이 렌더됨 ② "사이드바 접기"·
      "사이드바 펼치기" 버튼이 존재하지 않음 (FR-009, 계약 §6).
      **Verify RED**: 마이 페이지가 레일을 직접 렌더하지 않아(레일은 현재
      레이아웃 소관) ①이 실패하는 것을 확인

### Implementation for User Story 1

- [X] T005 [US1] `components/icons.tsx`에 `PanelLeftCloseIcon`·
      `PanelLeftOpenIcon` 추가 — lucide 동명(panel-left-close /
      panel-left-open) path, 기존 공통 속성(viewBox 24, stroke currentColor,
      stroke-width 2) 및 기본 크기 19px (DESIGN.md §4.7 관례, research R5)
- [X] T006 [US1] `components/IconRail.tsx` 수정 — ① 프롭
      `{ collapsed?: boolean; onToggleSidebar?: () => void }` 추가
      ② `onToggleSidebar` 있을 때만 레일 **최상단**(워크스페이스 타일 위)에
      RailButton 토글 렌더: 펼침 시 `PanelLeftCloseIcon` + title/aria-label
      "사이드바 접기", 접힘 시 `PanelLeftOpenIcon` + "사이드바 펼치기"
      ③ `collapsed=true`면 같은 `<nav>` 컨테이너(60px 스트립)에 토글 버튼만
      렌더하고 타일·홈·새 글·스페이서·아바타는 렌더하지 않음 (research R4·R5,
      계약 §1~§3). T002를 통과시키는 최소 구현만.
      **Verify GREEN**: `npm test` — T002 통과·기존 테스트 무결 확인
- [X] T007 [US1] `app/(app)/layout.tsx` + `app/(app)/page.tsx` 수정 —
      ① AppShell에서 `<IconRail />` 렌더·import 제거 ② WorkspacePage에
      `const [collapsed, setCollapsed] = useState(false)` 추가 ③
      `<IconRail collapsed={collapsed} onToggleSidebar={() => setCollapsed(c => !c)} />`
      렌더 (스토어 하이드레이션 대기 분기에도 레일이 보이도록 배치) ④
      `PostList`를 `<div style={{ display: collapsed ? "none" : "contents" }}>`
      래퍼로 감싸 마운트 유지한 채 숨김 (research R1~R3, FR-002·FR-003).
      T003을 통과시키는 최소 구현만. **Verify GREEN**: `npm test` 확인
- [X] T008 [P] [US1] `app/(app)/mypage/page.tsx` 수정 — 반환 JSX를 프래그먼트로
      감싸고 콘텐츠 앞에 프롭 없는 `<IconRail />` 렌더(하이드레이션 분기 포함).
      토글 프롭 미전달 → 버튼 없음 (FR-009). T004를 통과시키는 최소 구현만.
      **Verify GREEN**: `npm test` 확인. T007과 같은 커밋으로 묶는다
      (레일 이양이 두 페이지에 걸쳐야 앱이 일관됨)
- [X] T009 [US1] REFACTOR — 그린 유지하며 중복 제거·이름 정리만 수행
      (`components/IconRail.tsx`, `app/(app)/page.tsx`, 테스트 헬퍼 공통화 등).
      동작 추가 금지. 완료 후 `npm test` 재확인

**Checkpoint**: US1 완결 — 접기/펼치기 MVP가 단독으로 동작·검증 가능

---

## Phase 4: User Story 2 - 접힌 상태에서도 작업 연속성 유지 (Priority: P2)

**Goal**: 접힌 동안에도 편집·자동 저장이 평소처럼 동작하고, 다시 펼치면
검색어·선택 글이 그대로 유지된다. 접힘 중 사이드바 소속 기능(글 목록·검색·
홈·새 글·아바타)은 노출되지 않는다.

**Independent Test**: 검색어 입력·글 선택 후 접기 → 본문 편집 → 펼치기 →
검색어·선택 유지 확인 (quickstart.md 시나리오 3·4·5·9).

### Tests for User Story 2 (MANDATORY — constitution Principle I: TDD) ⚠️

> **NOTE: Write these tests FIRST and run them.** US1 구현이 "마운트 유지 +
> display 숨김"(research R3)을 채택했으므로 **즉시 통과할 수 있다** — 그 경우
> 새 동작이 아니라 스펙 수용 기준의 회귀 방지 테스트로 유지하고, T011은
> "변경 불필요"로 기록하고 건너뛴다. 실패하면 정상 RED이므로 T011로 진행한다.

- [X] T010 [US2] `app/(app)/page.test.tsx`에 US2 테스트 추가 — 케이스:
      ① 검색 입력에 `PRD` 입력 → 접기 → 펼치기 → 검색 input 값과 필터된
      목록이 유지됨 (US2-2, FR-005) ② 접힌 상태에서 본문 textarea에 입력 →
      값이 반영되고 편집이 평소처럼 동작 (US2-1, FR-006) ③ 접힌 상태에서
      검색 입력·"내 글"·홈·새 글·마이 페이지 버튼이 보이지 않음 (US2-3,
      계약 §3) ④ [Edge] 글 1개만 시드 후 접힘 상태에서 탑바 "삭제" → 확인
      "삭제" 클릭 → 빈 상태 화면("열려 있는 글이 없어요")이 표시되고
      "사이드바 펼치기" 버튼은 여전히 접근 가능(접힘 유지). 실행해 통과/실패
      여부와 이유 확인 → **결과: 4케이스 모두 즉시 통과** (US1이 "마운트
      유지 + display 숨김"으로 구현되어 상태 보존이 이미 충족 — 회귀
      테스트로 유지)

### Implementation for User Story 2

- [X] T011 [US2] T010이 실패한 경우에만: 원인에 따라 `app/(app)/page.tsx`
      (숨김 방식이 언마운트로 구현된 경우 display 숨김으로 교체) 또는
      `components/IconRail.tsx`(접힘 시 요소 잔존) 수정 후 **Verify GREEN**.
      T010이 즉시 통과했다면 이 태스크는 "변경 불필요"로 완료 처리
      → **변경 불필요로 완료** (T010 즉시 통과)

**Checkpoint**: US1 + US2 — 접기/펼치기와 작업 연속성 모두 단독 검증 가능

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: 문서 동기화(원칙 V)와 완료 게이트 검증

- [X] T012 [P] `DESIGN.md` 갱신 — 구현과 같은 작업 단위로 커밋 (원칙 V):
      §3.2(앱 셸: 레일 렌더가 페이지 소관으로 이동, 접힘 시 60px 스트립 +
      편집 영역 레이아웃), §4.1(IconRail: 프롭 2개, 구성 순서 "토글 → 타일 →
      홈 → 새 글 → 스페이서 → 아바타", 스트립 모드 명세, 토글 버튼
      상태별 아이콘·라벨), §4.7(아이콘 표에 PanelLeftCloseIcon·
      PanelLeftOpenIcon 19px 추가), §5(접기/펼치기 인터랙션 플로우 —
      비영속·마이 페이지 제외·모션 없음)
- [X] T013 quickstart.md 수동 검증 수행 — `npm run dev`로 시나리오 1~9 전부
      확인. 특히 ② 즉시 전환(모션 없음)·편집 영역 확장(SC-004), ⑤ Tab 순회
      시 숨긴 요소 미등장, ⑦ 새로고침 비영속. 결과를 사용자에게 보고
      → **결과**: 시나리오의 동작 로직은 자동 테스트 33개로 검증 완료, dev
      서버 3개 라우트(`/`·`/login`·`/mypage`) 컴파일·응답 정상 확인. wmux
      CLI 부재로 브라우저 **시각** 확인(폭 확장 체감·Tab 순회·새로고침)은
      미수행 — 사용자 확인 요청으로 보고 (dev 서버 가동 중)
- [X] T014 완료 게이트 최종 확인 — `npm test` 전체 통과·출력 무결, 모든 신규
      동작에 테스트 존재, 각 테스트의 RED(또는 즉시 통과 사유) 확인 기록,
      DESIGN.md 갱신 완료, 신규 노출 문자열 한국어뿐임 확인 (헌법 "개발
      워크플로 및 품질 게이트" 체크리스트)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존성 없음 — 즉시 시작
- **Foundational (Phase 2)**: 태스크 없음 (기존 인프라로 충분)
- **User Stories (Phase 3~4)**: T001 통과 후 시작. US2의 **테스트 실행**은
  토글이 존재해야 의미 있으므로 US1 완료 후 수행한다(테스트 작성 자체는
  먼저 가능)
- **Polish (Phase 5)**: 모든 스토리 완료 후

### User Story Dependencies

- **US1 (P1)**: 다른 스토리 의존 없음 — MVP. 레일 렌더 이양(layout →
  page/mypage)을 포함한다
- **US2 (P2)**: 토글이 존재해야 검증 가능 → US1 완료 후 실행. 추가 구현은
  조건부(T011)

### Within Each User Story

- 테스트 작성·RED 확인(또는 즉시 통과 사유 기록) → 최소 구현 → GREEN 확인 →
  리팩터 (constitution Principle I)
- US1 구현 순서: T005(아이콘) → T006(IconRail이 아이콘 import) →
  T007·T008(페이지들이 새 프롭 사용) → T009(리팩터)
- T007과 T008은 서로 다른 파일이라 병렬 가능하지만 **같은 커밋**으로 묶는다
  (레일 이양이 layout·두 페이지에 걸쳐 완성되어야 앱이 일관됨)

### Parallel Opportunities

- **T002 ∥ T003 ∥ T004**: 서로 다른 신규 테스트 파일 — 동시 작성 가능
- **T007 ∥ T008**: 서로 다른 파일 (단, 같은 커밋으로 묶음)
- **T012 ∥ T013**: 문서화와 수동 검증 — 파일 충돌 없음
- T010은 기존 `app/(app)/page.test.tsx`에 추가하므로 T003 완료 후 순차 처리

---

## Parallel Example: User Story 1

```bash
# 테스트 3건을 동시에 작성한 뒤, 각각 RED를 확인:
Task: "IconRail 토글/스트립 테스트 작성 in components/IconRail.test.tsx"   # T002
Task: "업무 화면 접기/펼치기 테스트 작성 in app/(app)/page.test.tsx"        # T003
Task: "마이 페이지 레일 테스트 작성 in app/(app)/mypage/page.test.tsx"      # T004

# RED 확인 후 구현은 의존 순서대로:
Task: "panel-left 아이콘 2종 추가 in components/icons.tsx"                # T005
Task: "IconRail 토글 버튼·스트립 모드 in components/IconRail.tsx"          # T006
Task: "레일 이양 + collapsed 상태 in app/(app)/layout.tsx, page.tsx"      # T007
Task: "마이 페이지 레일 직접 렌더 in app/(app)/mypage/page.tsx"            # T008  (T007과 병렬, 같은 커밋)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (T001) — 그린 기준선
2. Phase 3 (T002~T009) — US1 완성 (레일 이양 + 토글 + 스트립)
3. **STOP and VALIDATE**: quickstart 시나리오 1·2·6·8로 US1 단독 검증
4. 이 시점에서 이미 사용자 가치 완결 (버튼 하나로 접기/펼치기)

### Incremental Delivery

1. US1 → 단독 검증 → MVP
2. US2 (T010~T011) → 작업 연속성(검색어·편집·삭제 엣지) 확인 — 대부분 회귀
   테스트로 즉시 통과 예상
3. Polish (T012~T014) → DESIGN.md 동기화 + 수동 검증 + 완료 게이트

### 유의 사항 (이 기능 고유)

- US2는 US1의 "마운트 유지 + display 숨김" 설계(research R3)가 이미 충족할
  가능성이 높다 — 테스트가 즉시 통과하면 사유를 기록하고 회귀 테스트로
  유지한다 (억지로 RED를 만들기 위해 구현을 훼손하지 않는다)
- T007에서 PostList를 **언마운트하면 안 된다** — 검색어가 초기화되어
  T010-①이 실패한다 (FR-005 위반)
- 편집 영역 폭 확장(SC-004)·즉시 전환(SC-002)·Tab 순회는 jsdom으로 검증이
  어려우므로 T013 수동 검증이 필수 게이트다
- `next/navigation` 외에는 모킹 금지 (헌법 I 모킹 규칙, research R7)

---

## Notes

- [P] tasks = 서로 다른 파일, 의존성 없음
- [Story] 라벨로 태스크 ↔ 스토리 추적
- 각 태스크(또는 논리 그룹) 완료 후 커밋
- 금지: 테스트 없는 프로덕션 코드, 테스트보다 먼저 작성된 구현, 임의 스타일
  값(DESIGN.md에 없는 새 치수·색), 전환 모션 추가(FR-010)
