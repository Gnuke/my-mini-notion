# Tasks: 마이페이지 자기소개

**Input**: Design documents from `/specs/002-profile-introduction/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are MANDATORY per constitution Principle I (TDD — superpowers `/test-driven-development`). Every user story MUST include test tasks placed and executed BEFORE its implementation tasks, and each test MUST be verified to fail before implementing.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**사용자 사전 액션 (코드 외)**: `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY` 추가는
보호 훅 때문에 **사용자가 직접** 수행해야 한다 ([quickstart.md](./quickstart.md) 참조).
단위·계약·UI 테스트는 네트워크를 모킹하므로 키 없이 전부 실행 가능하다 — 키는
Phase 6의 수동 E2E 검증(T019)에서만 필요하다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Next.js App Router 단일 프로젝트 — plan.md의 Source Code 구조를 따른다.
테스트는 소스 옆 콜로케이션(`*.test.ts` / `*.test.tsx`).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 의존성·환경 변수 템플릿 준비

- [X] T001 [P] `package.json`에 `@supabase/supabase-js` v2 의존성을 추가하고 `npm install` 실행 (lock 파일 갱신 확인)
- [X] T002 [P] `.env.example`에 `SUPABASE_SERVICE_ROLE_KEY` 항목과 주석(서버 전용, NEXT_PUBLIC_ 금지, 대시보드 → Settings → API) 추가

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 유저 스토리가 의존하는 공유 로직 — lib 헬퍼와 API 라우트
(계약: [contracts/introduction-api.md](./contracts/introduction-api.md))

**⚠️ CRITICAL**: 이 페이즈 완료 전에는 어떤 유저 스토리 작업도 시작할 수 없다

- [X] T003 [P] `lib/introduction.test.ts` 작성 — `normalizeIntroduction`(trim-빈 값 → null, 내용은 원본 보존), 한도 판정(`countChars` 기반 500자 경계·조합 이모지), fetch 헬퍼 `fetchIntroduction`/`saveIntroduction`(성공/오류 매핑, global fetch 스텁) 실패 테스트. **Verify RED**: `npm test`로 "기능 부재" 사유 실패 확인
- [X] T004 `lib/introduction.ts` 최소 구현 — T003 테스트만 통과시킨다 (`countChars`는 `lib/chars.ts` 재사용). **Verify GREEN**: `npm test` 전체 통과·출력 무결
- [X] T005 [P] `app/api/profile/introduction/route.test.ts` 작성 — GET(값/NULL/행 0건/DB 오류), PUT(정상/공백만→null 정규화/501자 400 TOO_LONG/깨진 본문 400 INVALID_BODY/DB 오류 500), 500자 경계 200 — supabase-js가 쓰는 fetch를 PostgREST 실제 응답 구조로 스텁. **Verify RED** 확인
- [X] T006 `app/api/profile/introduction/route.ts` 구현 — 서비스 롤 키(`SUPABASE_SERVICE_ROLE_KEY`) + `NEXT_PUBLIC_SUPABASE_URL`, 첫 행 규칙(`order by created_at asc limit 1`), `introduction` 컬럼만 select/update, 서버에서도 `normalizeIntroduction`·한도 검증 재사용, 내부 오류 상세 미노출. **Verify GREEN** 확인

**Checkpoint**: 공유 로직·API 계약 완성 — 유저 스토리 UI 작업 시작 가능

---

## Phase 3: User Story 1 - 자기소개 등록과 확인 (Priority: P1) 🎯 MVP

**Goal**: 마이페이지에서 자기소개를 입력·저장하면 확인 표시가 나타나고,
새로고침·재방문 후에도 그대로 표시된다 (등록 + 조회 = MVP)

**Independent Test**: 자기소개 없는 상태에서 마이페이지 진입 → placeholder 확인
→ 입력 후 "변경 사항 저장" → 확인 표시 → 새로고침 후 같은 내용 표시
(quickstart.md 2~3단계)

### Tests for User Story 1 (MANDATORY — constitution Principle I: TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T007 [US1] `app/(app)/mypage/page.test.tsx` 작성 — ① 로딩 게이트: GET settle 전 폼 미표시, settle 후 표시 ② 미등록: placeholder `자신을 소개하는 글을 남겨보세요` 노출 ③ 등록: 여러 줄 입력 → 저장 클릭 → PUT 본문 `{introduction: "..."}` 검증 + 성공 시 `저장되었습니다 ✓` 표시 ④ 조회: GET이 저장본 반환 시 textarea에 줄바꿈 보존 표시 — `/api` fetch만 모킹, NookProvider는 실제 사용. **Verify RED** 확인

### Implementation for User Story 1

- [X] T008 [US1] `app/(app)/mypage/page.tsx` — 자기소개 로컬 상태(`introStatus`/`introduction`) 추가, 마운트 시 `fetchIntroduction` 1회 호출, `store.loaded && settle` 로딩 게이트, 라벨 `자기소개` + `<textarea class="nk-inp">`(별명 입력과 동일 리터럴 + `min-height: 120px; resize: none; line-height: 1.6`) + placeholder 렌더 (T007 ①②④ GREEN)
- [X] T009 [US1] `app/(app)/mypage/page.tsx` — "변경 사항 저장" onClick을 async 핸들러로 교체: `saveIntroduction` 성공 시에만 기존 `flash()` 호출 (T007 ③ GREEN). **Verify GREEN**: `npm test` 전체 통과·출력 무결
- [X] T010 [US1] `DESIGN.md` §4.6에 자기소개 필드 명세 추가 — 라벨·textarea 리터럴 값·placeholder 문구·로딩 게이트 규칙 ([contracts/mypage-introduction-ui.md](./contracts/mypage-introduction-ui.md) 배치·문자열 그대로)

**Checkpoint**: US1 단독으로 완전 동작 — MVP 검증 가능 (quickstart 2~3단계)

---

## Phase 4: User Story 2 - 자기소개 수정 (Priority: P2)

**Goal**: 기존 자기소개를 고쳐 저장하면 갱신되고, 전부 지우면 미등록 상태로
복귀한다. 500자 카운터·입력 가드·레거시 초과 데이터 규칙 포함

**Independent Test**: 저장된 자기소개를 수정 저장 → 재진입 시 수정본 표시 /
전부 지우고 저장 → placeholder 복귀 (quickstart 4~5단계)

### Tests for User Story 2 (MANDATORY — constitution Principle I: TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T011 [US2] `app/(app)/mypage/page.test.tsx`에 추가 — ① 기존 값 수정 저장 → PUT 본문 검증 ② 전부 지우고(또는 공백만) 저장 → `{introduction: null}` 전송 + placeholder 복귀 ③ 카운터 `N/500자` 실시간 갱신(조합 이모지 1자) ④ 500자에서 추가 입력 무시 ⑤ 레거시 600자: 전체 표시 + 카운터 danger 색 + 짧아지는 편집 허용 + 저장 시 요청 없이 `자기소개는 500자까지 저장할 수 있어요.` 표시. **Verify RED** 확인

### Implementation for User Story 2

- [X] T012 [US2] `app/(app)/mypage/page.tsx` — 입력 가드(≤500자 또는 짧아지는 변경만 수용), 카운터 행(`{countChars}/500자`, 초과 시 `var(--text-danger)`), 초과 상태 저장 거부 + 안내 문구, 비우기 저장 시 `normalizeIntroduction` 경유 null 전송 (T011 GREEN). **Verify GREEN**: `npm test` 전체 통과·출력 무결
- [X] T013 [US2] `DESIGN.md` §4.6에 카운터·한도 표시 명세 추가 (위치·크기·색상·초과 시 danger 규칙)

**Checkpoint**: US1 + US2 모두 독립 동작

---

## Phase 5: User Story 3 - 저장·불러오기 실패 시 안내와 입력 보존 (Priority: P3)

**Goal**: 저장 실패 시 한국어 안내 + 입력 보존 + 재시도 가능, 불러오기 실패 시
미등록과 구분되는 오류 상태(입력 비활성)로 표시

**Independent Test**: fetch 실패 모킹(테스트) / DevTools Offline(수동)으로 저장·
진입 각각 실패시켜 안내·입력 보존·구분 확인 (quickstart 6~7단계)

### Tests for User Story 3 (MANDATORY — constitution Principle I: TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T014 [US3] `app/(app)/mypage/page.test.tsx`에 추가 — ① PUT 실패 → `저장에 실패했습니다. 잠시 후 다시 시도해 주세요.` 표시 + textarea 값 유지 + flash 미발생 ② 실패 후 재시도 성공 → 오류 문구 제거 + `저장되었습니다 ✓` ③ GET 실패 → `자기소개를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.` + textarea `disabled` + placeholder 부재 (미등록 상태와 구분). **Verify RED** 확인

### Implementation for User Story 3

- [X] T015 [US3] `app/(app)/mypage/page.tsx` — `saveError` 상태(다음 시도 시 초기화), GET 실패 시 `load-error` 상태(textarea 비활성 + 오류 문구, 저장 차단) 구현 (T014 GREEN). **Verify GREEN**: `npm test` 전체 통과·출력 무결
- [X] T016 [US3] `DESIGN.md` §4.6에 오류 상태 2종(저장 실패·불러오기 실패) 문구·색상(`var(--text-danger)`)·비활성 규칙 명세 추가

**Checkpoint**: 세 스토리 모두 독립 동작

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 무회귀 확인·완료 게이트·수동 검증·문서 정합

- [X] T017 `app/(app)/mypage/page.test.tsx`에 무회귀 테스트 추가 — 별명 입력 즉시 반영(기존 setNickname 경로), 이메일 입력 disabled 유지 (FR-009/SC-004; 기존 동작 검증이므로 즉시 통과가 정상 — RED 불요)
- [X] T018 완료 게이트 실행 — `npm test` 전체 통과 + 출력 무결(에러·경고 0) 확인, 실패 시 코드 수정 (헌법 완료 게이트)
- [X] T019 `quickstart.md` 수동 E2E 검증 수행 — 사용자 `.env.local` 준비 후 `npm run dev`로 1~8단계 + 성공 기준(SC-001~004) 대조
  - **1차(2026-07-16, 키 없음)**: 라이브 API 계약 확인 — 400 TOO_LONG / 400 INVALID_BODY /
    500 LOAD_FAILED·SAVE_FAILED 모두 계약대로. 불러오기 실패 UI 경로와 일치
  - **2차(2026-07-16, 키 적용 후)**: 실제 DB 왕복 E2E 완료 — 등록(줄바꿈·이모지 보존)→
    재조회 일치→비우기(null) 복원까지 확인, Supabase 테이블 값 대조 완료.
    이 과정에서 **Next.js 데이터 캐시가 stale 조회 응답을 반환하는 버그 발견** →
    TDD로 수정(`force-dynamic` + DB fetch `cache: "no-store"`, 테스트 3건 추가, 전체 70개 통과)
- [X] T020 문서·코드 최종 동기화 점검 — spec.md/plan.md/DESIGN.md §4.6과 구현 결과 대조, 어긋남 발견 시 보고 후 같은 작업 단위에서 해소 (원칙 V)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존성 없음 — 즉시 시작 가능
- **Foundational (Phase 2)**: T001 완료 후 (supabase-js import 필요) — 모든 유저 스토리를 블로킹
- **User Stories (Phase 3~5)**: Phase 2 완료 후. 세 스토리 모두 같은 파일 쌍
  (`page.tsx`/`page.test.tsx`)을 수정하므로 **우선순위 순서(P1 → P2 → P3) 순차 진행**
- **Polish (Phase 6)**: 모든 스토리 완료 후

### User Story Dependencies

- **US1 (P1)**: Foundational만 의존 — MVP
- **US2 (P2)**: US1의 자기소개 영역(텍스트에어리어·저장 연동) 위에 카운터·가드를 얹음
- **US3 (P3)**: US1의 로드/저장 경로에 오류 분기를 얹음 (US2와는 독립)

### Within Each User Story

- 테스트 작성 → **Verify RED** → 최소 구현 → **Verify GREEN** → (필요 시 리팩터) 순서 엄수
- DESIGN.md 갱신 태스크는 해당 스토리의 UI 구현과 같은 작업 단위로 커밋 (원칙 V)

### Parallel Opportunities

- Phase 1: T001 ∥ T002 (다른 파일)
- Phase 2: T003 ∥ T005 (테스트 파일 상호 독립 — 단 T004는 T003 뒤, T006은 T004·T005 뒤)
- Phase 3~5: 같은 파일을 다루므로 스토리 간 병렬 불가 (순차)
- 문서 태스크(T010/T013/T016)는 각 스토리 구현 직후 해당 구현과 병행 가능

## Parallel Example: Phase 2

```bash
# 서로 다른 테스트 파일 동시 작성 (둘 다 RED 확인까지):
Task: "lib/introduction.test.ts — normalize·한도·fetch 헬퍼 실패 테스트 (T003)"
Task: "app/api/profile/introduction/route.test.ts — GET/PUT 계약 실패 테스트 (T005)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (Setup) → Phase 2 (Foundational: lib + API, TDD)
2. Phase 3 (US1: 등록·확인) 완료
3. **STOP & VALIDATE**: `npm test` + quickstart 2~3단계 — 등록/조회가 새로고침에도 유지되면 MVP 완성
4. 이후 US2(수정·한도) → US3(실패 처리) → Polish 순 증분 딜리버리

### Incremental Delivery

각 스토리 체크포인트마다 `npm test` 전체 통과 상태로 커밋 — 이전 스토리를
깨뜨리지 않고 가치를 누적한다. 수동 E2E(T019)만 사용자 `.env.local` 준비가
선행되어야 한다.

---

## Notes

- [P] = 다른 파일·의존성 없음. [Story] 라벨은 유저 스토리 페이즈에만 부여
- 모든 신규 프로덕션 코드는 실패 테스트 선행 (헌법 원칙 I — 위반 시 삭제 후 재시작)
- 모킹은 네트워크 fetch 경계만 — supabase-js·앱 코드는 실제 실행, 모의 응답은 PostgREST 실제 구조 반영
- DB 스키마·정책·다른 컬럼은 어떤 태스크에서도 건드리지 않는다 (사용자 제약)
- 각 태스크(또는 논리 그룹) 완료 시 커밋
