# Tasks: 페이지 게시글 서버 저장 및 사용자별 접근 제어

**Input**: Design documents from `/specs/002-supabase-page-crud/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/page-store.md, contracts/page-ui.md, quickstart.md

**Tests**: Tests are MANDATORY per constitution Principle I (TDD — superpowers `/test-driven-development`). Every user story MUST include test tasks placed and executed BEFORE its implementation tasks, and each test MUST be verified to fail before implementing (`npm test`로 Verify RED → 구현 → Verify GREEN).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

단일 Next.js 앱 (repository root): `app/`, `components/`, `lib/`,
`supabase/migrations/`. 테스트는 소스 옆 콜로케이션(`*.test.ts(x)`).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 신규 의존성과 Supabase 클라이언트 seam 준비

- [X] T001 `npm install @supabase/supabase-js @supabase/ssr` 실행해 package.json 의존성 추가 (plan.md Technical Context)
- [X] T002 lib/supabase/client.ts 생성 — `getSupabase()` 모듈 싱글턴, `createBrowserClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)` (contracts/page-store.md §1). 병행 인증 기능이 이미 만들었으면 계약 충족 확인만
- [X] T003 [P] `.env.example`을 복사해 `.env.local` 생성하고 실제 값 입력 확인 (quickstart.md §1-3 — git 미커밋 파일)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: RLS 정책 — 정책 0개 상태에서는 모든 스토리의 서버 접근이 거부되므로 최우선 선행

**⚠️ CRITICAL**: 이 단계 전에는 어떤 유저 스토리도 실 DB에 대해 동작할 수 없음

- [X] T004 supabase/migrations/20260716_page_rls_policies.sql 작성 — research.md R3의 정책 4개(select/insert/update/delete, `to authenticated`, `auth.uid() = user_id`) 그대로. 테이블 구조(컬럼·제약) 변경 SQL 금지(FR-005)
- [X] T005 마이그레이션을 Supabase에 적용(MCP `apply_migration` 또는 대시보드)하고 quickstart.md §3 SQL로 정책 4개·컬럼 5개 불변 확인

**Checkpoint**: DB 접근 규칙 준비 완료 — 유저 스토리 구현 시작 가능

---

## Phase 3: User Story 1 - 내 글이 계정에 저장되고 어디서든 유지됨 (Priority: P1) 🎯 MVP

**Goal**: 글 생성·편집·삭제가 localStorage가 아닌 `page` 테이블에 저장되고, 새로고침·재로그인·다른 기기에서도 유지된다. 로딩/저장 표시/오류 상태 포함.

**Independent Test**: `npm test`로 스토어·컴포넌트 동작 검증(모의 Supabase). 실 서버 검증은 quickstart.md §4-1~4, 8~10 (인증 기능 합류 후).

### Tests for User Story 1 (MANDATORY — constitution Principle I: TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation (`npm test`)**

- [X] T006 [P] [US1] lib/pages.test.ts 신규 작성 — `mapRow`(content null→`""`, created_at→epoch ms), `fetchPages`(created_at 내림차순, user_id 클라이언트 필터 없음), `createPage`(title `""`·content `""`·user_id 명시 insert 후 반환 row 매핑), `updatePage`(body→content 매핑, id 대상), `deletePage`, Supabase 오류 시 throw. 모의 클라이언트는 contracts/page-store.md §4의 체이닝·`{ data, error }` 전체 형태 재현. Verify RED
- [X] T007 [P] [US1] lib/store.test.tsx 신규 작성 — 초기 `loading` true→목록 도착 후 false·첫 글 자동 선택(없으면 빈 상태), `loadError`·`retry`, `newPost` 성공(맨 앞 추가·선택)/실패(`createFailed`, 글 미생성), `patch` 로컬 즉시 반영+600ms 디바운스 1회 update+`select()`/언마운트 flush, `saved`가 서버 성공 후에만 1.5초 true(FR-012), update 실패 시 `saveFailed`+로컬 내용 유지(FR-007), `remove` 성공 시 제거·실패 시 유지, localStorage에 글·selectedId 미기록(FR-006), 시드 미생성. 모킹은 `@/lib/supabase/client` 1곳(세션 사용자 존재 경로). Verify RED
- [X] T008 [P] [US1] components/PostList.test.tsx 신규 작성 — `loading` 중 `불러오는 중…` 표시·빈 상태 문구 미노출(FR-011), `loadError` 시 `글을 불러오지 못했어요.`+`다시 시도` 버튼→`retry` 호출, `createFailed` 시 `새 글을 만들지 못했어요.` 줄, 행에 이모지 없음·메타가 `rel(created)` 기준, 글 0개 시 기존 빈 상태 유지 (contracts/page-ui.md §1). Verify RED
- [X] T009 [US1] components/Editor.test.tsx 수정 — makePost 헬퍼를 새 Post 모델(id/title/body/created)로 축소, 저장 표시 4상태(`자동 저장`/`저장됨 ✓` 서버 성공 후/`저장 실패`/`삭제 실패`), 메타 줄 `{rel(created)} 작성됨`, 이모지·커버 UI 부재 테스트 추가 (contracts/page-ui.md §2). 기존 글자 수 테스트는 유지. Verify RED (신규 테스트가 기능 부재로 실패)

### Implementation for User Story 1

- [X] T010 [US1] lib/data.ts 수정 — `Post`를 `{ id, title, body, created }`로 축소, `CoverKey`/`EMOJIS`/`COVERS`/`makeSeed`/`uid` 제거, `rel`·`Profile`·`DEFAULT_PROFILE`·`AUTH_KEY` 유지 (data-model.md §2); lib/data.test.ts에서 제거된 심볼 참조 정리
- [X] T011 [US1] lib/pages.ts 신규 구현 — contracts/page-store.md §2의 `mapRow`/`fetchPages`/`createPage`/`updatePage`/`deletePage` (T006 GREEN)
- [X] T012 [US1] lib/store.tsx 재작성 — Supabase 연동: 초기화 시 `auth.getUser()`→`fetchPages`, `loading`/`loadError`/`retry`, async `newPost`/디바운스 `patch`/async `remove`, `saved`(서버 성공 후)/`saveFailed`/`createFailed`, 글 데이터 localStorage 영속 제거·프로필만 유지 (contracts/page-store.md §3 — 이 태스크는 세션 존재 경로까지, 세션 없음 처리는 T022) (T007 GREEN)
- [X] T013 [US1] 스토어 인터페이스 변경 호출부 갱신 — components/IconRail.tsx·components/EmptyState.tsx·app/(app)/page.tsx에서 async `newPost`/`loading` 반영 (기존 하이드레이션 플레이스홀더는 loading 상태와 정합)
- [X] T014 [US1] components/PostList.tsx 수정 — 이모지 열 제거, 메타 `rel(created)`, 로딩·조회 실패·생성 실패 상태 렌더 (contracts/page-ui.md §1) (T008 GREEN)
- [X] T015 [US1] components/Editor.tsx 수정 — 이모지·커버 UI 전부 제거(제목이 `margin-top: 12px` 승계), 메타 줄 `{rel(created)} 작성됨`, 저장 표시 상태 머신, 삭제 확정 시 서버 성공 후 제거 (contracts/page-ui.md §2) (T009 GREEN)
- [X] T016 [US1] app/login/page.tsx 안내 문구 갱신 — `로그인하면 내 글이 이 브라우저에 안전하게 저장됩니다.` → 계정 저장 표현(예: `로그인하면 내 글이 내 계정에 안전하게 저장됩니다.`) — 저장 위치 변경의 사용자 노출 결과(한국어 — 원칙 III)
- [X] T017 [US1] DESIGN.md 갱신 — §4.2(목록: 이모지 제거·시간 기준·로딩/오류 상태), §4.3(에디터: 이모지·커버 절 삭제·작성됨·저장 표시 4종), §4.5(로그인 안내 문구), §5(자동 저장 디바운스·서버 성공 기준, 시드 제거, 글 영속 제거·선택 비영속) — contracts/page-ui.md §4 매핑, 구현과 같은 작업 단위(원칙 V)
- [X] T018 [US1] Verify GREEN — `npm test` 전체 통과·출력 무결(에러·경고 없음) 확인 (헌법 완료 게이트)

**Checkpoint**: US1 완결 — 모의 Supabase 기준 저장·유지·표시 동작이 전부 테스트로 증명됨

---

## Phase 4: User Story 2 - 내 글만 보이고 내 글만 관리할 수 있음 (Priority: P2)

**Goal**: 사용자 간 데이터 격리 — 타인 글은 목록·직접 접근 어디서도 조회·수정·삭제 불가(DB 수준 강제).

**Independent Test**: quickstart.md §3 SQL로 정책 의미 검증. 실계정 2개 격리 검증은 quickstart.md §4-5·6 (인증 기능 합류 후).

> 격리의 강제 지점은 Phase 2에서 적용한 RLS 정책이며(연산·조건은 T006·T007
> 테스트가 계약으로 고정), 이 단계는 DB에 적용된 정책의 의미를 검증·기록한다.

- [X] T019 [US2] RLS 정책 검증 — quickstart.md §3의 두 SQL을 실행해 정책 4개(polcmd r/a/w/d)·roles `{authenticated}`·`auth.uid() = user_id`(UPDATE는 USING+WITH CHECK 모두) 확인, 결과를 specs/002-supabase-page-crud/quickstart.md 체크 항목에 기록
- [X] T020 [US2] 격리 계약 코드 확인 — lib/pages.ts의 `fetchPages`가 user_id 클라이언트 필터 없이 RLS에 위임하는지, `createPage`가 세션 사용자 id를 명시하는지 검토(contracts/page-store.md §2·data-model.md §3); 실계정 E2E(quickstart.md §4-5·6)는 인증 기능 합류 후 수행으로 기록

**Checkpoint**: 격리 규칙이 DB에 적용·검증됨 — US1과 독립적으로 확인 가능

---

## Phase 5: User Story 3 - 로그인하지 않으면 글을 쓸 수 없음 (Priority: P3)

**Goal**: 비로그인 상태에서는 글 화면 접근·등록이 불가하고, 저장소 수준에서도 거부된다.

**Independent Test**: `npm test`(세션 없음 경로) + 정책 `to authenticated` 확인. 화면 이동 검증은 quickstart.md §4-7 (인증 기능 합류 후).

### Tests for User Story 3 (MANDATORY — constitution Principle I: TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation (`npm test`)**

- [X] T021 [US3] lib/store.test.tsx에 세션 없음 테스트 추가 — `auth.getUser()`가 사용자 없음(`{ data: { user: null }, error: null }`)을 반환하면 `fetchPages` 미호출·`loading` 해제·글 목록 빈 요청 상태 유지 (contracts/page-store.md §3-1). Verify RED

### Implementation for User Story 3

- [X] T022 [US3] lib/store.tsx 보완 — 세션 없음 시 데이터 요청 생략 후 기존 가드 흐름(로그인 화면 안내)에 위임 (T021 GREEN; 실제 로그인 전환은 별도 기능 — FR-010)
- [X] T023 [US3] 저장소 수준 차단 확인 — pg_policy 조회로 `anon` 대상 정책이 없음을 확인·기록(비로그인 등록 경로 0개 — SC-003), 화면 리디렉션 검증(quickstart.md §4-7)은 인증 기능 합류 후 수행으로 기록

**Checkpoint**: 세 스토리 모두 독립 검증 가능

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 문서 동기화 마무리·정리·완료 게이트

- [X] T024 [P] README.md의 저장 방식 서술 갱신 — localStorage 저장 설명을 Supabase 계정 저장으로 (문서·코드 동기화 — 원칙 V)
- [X] T025 [P] 잔재 정리 확인 — lib/·components/에서 제거 심볼(EMOJIS/COVERS/uid/makeSeed/updated) 참조 0건, `LS_KEY`는 프로필 용도만 남았는지 확인 후 `npm run lint` 통과
  - 참고(2026-07-16): 잔재 0건 확인 완료. `npm run lint`는 프로젝트에 ESLint 설정이 없는 기존 상태(최초 대화형 설정 필요)라 실행 불가 — `npx tsc --noEmit`(0 에러)와 `npm run build`(성공, 타입 검증 포함)로 대체
- [X] T026 quickstart.md §2(npm test 무결)·§3(DB 검증)·§5(DESIGN.md 동기화 체크) 전체 수행 — 헌법 완료 게이트 최종 확인 (2026-07-16: 58/58 통과·출력 무결, DB 검증 기록, 문서 동기화 완료)
- [ ] T027 인증 기능 합류 후 quickstart.md §4 수동 E2E 시나리오 1~10 수행 (합류 전이면 이 태스크만 보류로 남기고 사유 기록 — FR-010 의존)
  - 보류(2026-07-16): 실제 인증(구글 로그인) 기능이 아직 합류하지 않아 로그인 세션 기반 E2E를 수행할 수 없음. 현재 모의 로그인에는 Supabase 세션이 없어 세션 없음 경로(빈 목록)로 동작하는 것이 정상. 인증 기능 합류 후 quickstart.md §4의 10개 시나리오를 수행할 것

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 없음 — 즉시 시작 가능
- **Foundational (Phase 2)**: T001~T003 이후 (실 DB 접근의 전제) — 모든 스토리를 블록
- **User Stories (Phase 3~5)**: Phase 2 완료 후. 우선순위 순서(P1 → P2 → P3) 권장
  - US2(T019~T020)는 Phase 2 산출물 검증이 핵심이라 US1과 병행 가능
  - US3(T021~T023)은 T012(store 재작성) 이후에만 가능
- **Polish (Phase 6)**: 원하는 스토리 완료 후. T027은 외부(인증 기능) 의존

### Within Each User Story

- 테스트 작성 → `npm test`로 RED 확인 → 구현 → GREEN 확인 순서 엄수(원칙 I)
- US1 내부: T010(모델) → T011(pages) → T012(store) → T013~T015(UI) → T016~T017(문구·문서) → T18(게이트)

### Parallel Opportunities

- Phase 1: T003은 T001·T002와 병렬 가능
- US1 테스트 작성: T006·T007·T008 병렬 (서로 다른 신규 파일; T009는 기존 파일 수정이라 별도)
- US2(T019~T020)는 US1 구현과 병렬 가능 (DB·문서 작업으로 파일 충돌 없음)
- Phase 6: T024·T025 병렬

## Parallel Example: User Story 1

```text
# 테스트 먼저 동시 작성 (작성 후 npm test로 전부 RED 확인):
Task: "lib/pages.test.ts 신규 작성 (T006)"
Task: "lib/store.test.tsx 신규 작성 (T007)"
Task: "components/PostList.test.tsx 신규 작성 (T008)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup → Phase 2: Foundational (RLS — CRITICAL)
2. Phase 3: US1 완료 → `npm test` 전체 통과 확인
3. **STOP and VALIDATE**: 모의 기준 저장·유지·표시가 전부 증명되면 MVP
4. 실 서버 체감 검증은 인증 기능 합류 후 quickstart.md §4

### Incremental Delivery

1. Setup + Foundational → DB 준비 완료
2. US1 → 서버 저장 MVP
3. US2 → 격리 검증 완료
4. US3 → 비로그인 차단 완결
5. Polish → 문서 동기화·게이트 확인

---

## Notes

- [P] tasks = 서로 다른 파일·의존 없음
- 모킹은 `@/lib/supabase/client` 경계 1곳만, 응답은 전체 형태 재현(헌법 I — research.md R5)
- page 테이블 구조 변경 SQL은 어떤 태스크에서도 금지(FR-005)
- 각 태스크(또는 논리 그룹) 완료 후 커밋, 체크포인트마다 독립 검증
- DESIGN.md·README 갱신은 해당 변경과 같은 작업 단위(원칙 V)
