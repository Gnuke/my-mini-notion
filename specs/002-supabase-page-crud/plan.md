# Implementation Plan: 페이지 게시글 서버 저장 및 사용자별 접근 제어

**Branch**: `002-supabase-page-crud` | **Date**: 2026-07-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-supabase-page-crud/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

글 데이터의 저장소를 브라우저 localStorage(`mini-nook-v1`)에서 사용자가 미리
만들어 둔 Supabase `public.page` 테이블(id, created_at, title, content,
user_id — 구조 변경 금지)로 전환한다. 클라이언트 컴포넌트에서
`@supabase/ssr`의 브라우저 클라이언트로 직접 CRUD를 수행하고, 사용자별 격리는
RLS 정책 4개(`user_id = auth.uid()`)를 이 기능에서 추가해 DB 수준에서 강제한다
(사용자 확인 완료 — 테이블 구조는 변경하지 않음). 테이블에 저장 컬럼이 없는
이모지·커버·최근 수정 시각은 UI에서 제거하고 정렬·시간 표시를 생성 시각
기준으로 바꾼다. 서버 저장은 입력 후 디바운스로 수행하고 "저장됨 ✓"는 서버
저장 성공 후에만 표시한다. 목록 로딩 문구·저장 실패 안내 등 새 한국어 UI
상태를 추가하며, 실제 인증(구글 로그인)은 별도 기능이 담당한다(이 기능은
로그인된 Supabase 세션을 전제로 함).

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), React 18.3, Next.js 14.2 (App Router)

**Primary Dependencies**: `@supabase/supabase-js` + `@supabase/ssr` [신규] —
브라우저 클라이언트(`createBrowserClient`)로 인증 기능(별도 진행)과 쿠키 기반
세션을 공유. 그 외 신규 의존성 없음

**Storage**: Supabase Postgres `public.page` 테이블 (구조 변경 금지, RLS 정책
4개만 추가 — [research.md](./research.md) R3). 글·선택 상태의 localStorage
영속은 제거, 프로필(`mini-nook-v1`)은 범위 밖이라 localStorage 유지

**Testing**: Vitest 4 + React Testing Library + jsdom (`npm test`). Supabase
클라이언트 모듈 경계만 모킹(실제 API 응답 형태 전체 반영 — R5), 나머지는 실제
스토어·컴포넌트 사용

**Target Platform**: 모던 브라우저 (기존 Nook 지원 범위와 동일)

**Project Type**: Next.js 웹 앱 (단일 프로젝트, 클라이언트 컴포넌트 중심)

**Performance Goals**: 로그인 직후 글 목록 3초 이내 표시(SC-005, 1회 select).
입력 반응성은 로컬 상태 즉시 반영으로 유지하고 서버 쓰기는 600ms 디바운스로
합류(R4) — 키 입력마다 네트워크 왕복 없음

**Constraints**: page 테이블 구조(컬럼·제약) 변경 금지(FR-005). 실제 인증은
별도 기능 의존(FR-010) — 로그인 세션 없이는 E2E 검증 불가(quickstart에 검증
경로 분리). 헌법 II — 신규 UI 상태 값은 DESIGN.md 기존 토큰·기록된 리터럴
패턴만 조합

**Scale/Scope**: 개인용 미니 노션 — 사용자당 글 수십~수백 개 규모. 화면 2곳
수정(목록·에디터), 신규 모듈 2개(`lib/supabase/client.ts`, `lib/pages.ts`),
스토어 재작성 1건, RLS 마이그레이션 1건, DESIGN.md 갱신

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Gates from `.specify/memory/constitution.md` (v1.0.0):

- [x] **원칙 I — TDD (NON-NEGOTIABLE)**: 계획이 superpowers `/test-driven-development` 절차를 전제로 하는가?
  모든 구현 작업이 "실패 테스트 먼저(Red) → 최소 구현(Green) → 리팩터(Refactor)" 순서로 배치 가능한가?
  테스트는 Vitest + React Testing Library(`npm test`)를 사용하는가?
  → **통과.** `lib/pages.test.ts`(매핑·CRUD 호출) → `lib/pages.ts`,
  `lib/store.test.tsx`(로딩·CRUD·저장 표시·오류) → `lib/store.tsx`,
  `components/*.test.tsx`(로딩 문구·시간 표시·저장 표시) → 컴포넌트 수정
  순서로 배치 가능. 모킹은 Supabase 클라이언트 모듈 경계 1곳만(R5 — 외부
  네트워크는 헌법이 허용하는 불가피한 모킹 지점), 응답은 실제
  `{ data, error }` 구조 전체를 반영한다.
- [x] **원칙 II — 디자인 명세 단일 출처**: UI 변경이 포함되면 `DESIGN.md`를 먼저 읽고 토큰·리터럴 값을 따르는 계획인가?
  코드와 명세 불일치 발견 시 임의 수정 없이 보고하는가?
  → **통과.** DESIGN.md 전문을 읽었음(2026-07-16). 코드와 DESIGN.md 간 불일치
  없음 — 이모지·커버·`updated` 관련 기술은 현재 코드와 일치하며, 이번 제거는
  불일치 수정이 아니라 명세(FR-009)가 승인한 의도적 변경이다. 신규
  상태(로딩·저장 실패)의 문구·스타일은 기존 토큰(`--text-tertiary`,
  `--text-danger` 등)과 기록된 리터럴 패턴만 조합하고
  [contracts/page-ui.md](./contracts/page-ui.md)에 값을 명시했다.
- [x] **원칙 III — 한국어 UI**: 새로 추가되는 사용자 노출 문자열이 모두 한국어인가?
  → **통과.** 신규 문자열: `불러오는 중…`, `글을 불러오지 못했어요.`,
  `다시 시도`, `저장 실패`, `{rel} 작성됨` — 전부 한국어
  (contracts/page-ui.md에 전수 기록).
- [x] **원칙 IV — 단순성 (YAGNI)**: 현재 요구사항 이상의 추상화·옵션을 만들지 않는가?
  불가피한 복잡성은 아래 Complexity Tracking에 정당화했는가?
  → **통과.** 데이터 접근은 얇은 함수 모듈 1개(`lib/pages.ts`) — repository
  패턴·react-query·오프라인 큐·낙관적 롤백 프레임워크 등 도입하지 않음.
  디바운스는 타이머 1개로 구현. 위반 없음 → Complexity Tracking 비어 있음.
- [x] **원칙 V — 문서·코드 동기화**: 디자인·명세 문서 갱신이 같은 작업 단위에 포함되어 있는가?
  → **통과.** 이모지·커버 제거, 메타 줄 `작성됨` 전환, 로딩·오류 상태 추가에
  따른 DESIGN.md(§4.2, §4.3, §5) 갱신을 구현과 같은 작업 단위로
  배치(quickstart 체크 항목 포함). RLS 마이그레이션 SQL은 저장소에 체크인.

**Post-Design 재평가 (Phase 1 산출물 작성 후)**: 위 5개 게이트 모두 유지 —
설계 산출물이 추가한 것은 신규 의존성 2개(`@supabase/supabase-js`,
`@supabase/ssr` — 저장소 전환 요구사항의 직접 수단)와 RLS 정책 4개(사용자
승인)뿐이며, 새 임의 스타일 값·영어 UI 문자열·불필요한 추상화를 도입하지
않음을 확인함.

## Project Structure

### Documentation (this feature)

```text
specs/002-supabase-page-crud/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   ├── page-store.md    # 데이터 접근 + 스토어 상태 계약
│   └── page-ui.md       # UI 상태·문자열 계약 (로딩/오류/저장 표시/시간 표시)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
lib/
├── supabase/
│   └── client.ts        # [신규] 브라우저 Supabase 클라이언트 팩토리 (@supabase/ssr)
│                        #   — 인증 기능(별도 진행)과 공유하는 seam (.env.example에 이미 명시)
├── pages.ts             # [신규] page 테이블 CRUD + DB row ↔ Post 매핑
├── pages.test.ts        # [신규] 매핑·CRUD 호출·오류 전파 테스트 (테스트 먼저)
├── data.ts              # [수정] Post에서 emoji/cover/updated 제거,
│                        #   EMOJIS/COVERS/CoverKey/makeSeed/uid/LS_KEY(글 용도) 정리
├── data.test.ts         # [수정] 삭제된 심볼 관련 테스트 정리, rel()은 유지
├── store.tsx            # [수정] localStorage 영속 → Supabase CRUD,
│                        #   loading/loadError/saved(서버 성공 후)/saveFailed 상태
├── store.test.tsx       # [신규] 스토어 동작 테스트 (테스트 먼저)
└── auth.ts              # 변경 없음 (모의 로그인 가드는 인증 기능이 교체 예정)

components/
├── PostList.tsx         # [수정] 이모지 열 제거, rel(created) 표시, 로딩·오류 상태
├── Editor.tsx           # [수정] 이모지·커버 UI 제거, 메타 줄 "{rel(created)} 작성됨",
│                        #   저장 표시 상태 머신(자동 저장/저장됨 ✓/저장 실패)
└── Editor.test.tsx      # [수정] Post 모델 변경 반영 + 저장 표시·삭제 테스트

supabase/
└── migrations/
    └── 20260716_page_rls_policies.sql  # [신규] RLS 정책 4개 (구조 변경 없음)

DESIGN.md                # [수정] §4.2/§4.3/§5 — 이모지·커버 제거, 시간 표시,
                         #   로딩·오류·저장 상태 명세 갱신 (같은 작업 단위)
package.json             # [수정] @supabase/supabase-js, @supabase/ssr 추가
.env.example             # 변경 없음 (필요 환경변수 이미 기록됨)
```

**Structure Decision**: 기존 단일 Next.js 앱 구조를 그대로 사용한다. 데이터
접근은 `lib/pages.ts` 얇은 함수 모듈로 분리해 스토어(`lib/store.tsx`)가
저장소 세부를 모르게 하고, 테스트에서 모킹 경계를 이 모듈이 사용하는 Supabase
클라이언트 1곳으로 좁힌다(원칙 I·IV). `lib/supabase/client.ts`는 병행 중인
인증 기능과 공유하는 파일로, 이미 존재하면 그대로 사용하고 없으면 이 기능이
생성한다(.env.example의 사용처 목록과 일치).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

위반 없음 — 해당 사항 없음.
