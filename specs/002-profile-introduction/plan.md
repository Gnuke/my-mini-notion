# Implementation Plan: 마이페이지 자기소개

**Branch**: `002-profile-introduction` | **Date**: 2026-07-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-profile-introduction/spec.md`

## Summary

마이페이지에 자기소개 입력 영역(여러 줄)을 추가하고, 사용자가 미리 만들어 둔
Supabase `public.profile.introduction` 컬럼(text, nullable)에 등록/수정/조회를
연결한다. DB 구조·정책은 일절 변경하지 않는다.

핵심 기술 결정(상세는 [research.md](./research.md)): `profile` 테이블의 RLS
정책이 `authenticated` 역할 전용이고 앱 인증은 모의(localStorage)라 Supabase
세션이 없으므로, 클라이언트 anon 접근은 불가능하다. 따라서 서버 전용 Next.js
Route Handler(`GET/PUT /api/profile/introduction`)가 서비스 롤 키로 단일 프로필
행의 `introduction`만 읽고 쓴다. 마이페이지는 진입 시 이 API로 자기소개를
불러온 뒤 화면을 표시하고, 기존 "변경 사항 저장" 버튼이 저장을 트리거한다.
500자 제한은 기존 `lib/chars.ts`의 `countChars`(grapheme 단위)를 재사용한다.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict) / React 18.3 / Next.js 14.2 (App Router)

**Primary Dependencies**: next, react, react-dom (기존) + `@supabase/supabase-js` v2 (신규 — 서버 라우트에서만 사용)

**Storage**:
- Supabase Postgres `public.profile.introduction` (text, nullable) — **구조·정책 변경 금지** (사용자 제약)
- localStorage `mini-nook-v1` (기존 글·프로필) — **자기소개는 저장하지 않음** (DB가 단일 원천)

**Testing**: Vitest 4 + React Testing Library + jsdom (`npm test`). 외부 경계(네트워크 fetch)만 최소 모킹

**Target Platform**: 데스크톱 브라우저 + Next.js dev/서버 (Node 런타임 Route Handler)

**Project Type**: 단일 Next.js 웹 앱 (프론트 + 서버 라우트 동일 저장소)

**Performance Goals**: 저장/조회 결과를 체감 지연 없이 피드백 (SC-003); 단일 사용자 프로토타입이라 처리량 목표 없음

**Constraints**:
- DB 스키마·RLS 정책·데이터 구조 변경 금지 (introduction 값의 읽기/쓰기만 허용)
- `.env*` 파일은 보호 훅으로 접근 차단 — `.env.example`만 수정 가능. 서비스 롤 키는 사용자가 직접 `.env.local`에 추가해야 함
- 모의 인증(localStorage) 유지 — 실제 Supabase Auth 도입은 범위 밖 (FR-009)
- 서비스 롤 키는 서버 전용 (NEXT_PUBLIC_ 접두사 금지, 클라이언트 번들 노출 금지)

**Scale/Scope**: 단일 사용자, profile 행 1건, 화면 1개(마이페이지) + API 라우트 1개

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Gates from `.specify/memory/constitution.md` (v1.0.0):

- [x] **원칙 I — TDD (NON-NEGOTIABLE)**: 모든 구현 태스크는 실패 테스트 선행(Red→Green→Refactor)으로 배치한다.
  대상: `normalizeIntroduction`/한도 검사(lib), Route Handler(GET/PUT, fetch 모킹), 마이페이지 UI(등록/수정/비움/로딩 게이트/오류 상태, RTL).
  테스트는 Vitest + RTL(`npm test`), 소스 옆 콜로케이션.
- [x] **원칙 II — 디자인 명세 단일 출처**: `DESIGN.md`를 이번 세션에서 Read 완료(§4.6 마이 페이지).
  자기소개 입력은 기존 별명 입력(`.nk-inp`)·필드 라벨·저장 확인 문구의 리터럴 값을 그대로 따른다.
  자기소개 textarea 고유 값(min-height 등)은 DESIGN.md에 미정 항목이므로 신규로 확정해 같은 커밋에서 §4.6에 기록한다.
  코드-문서 불일치 발견 시 임의 수정 없이 보고한다.
- [x] **원칙 III — 한국어 UI**: 신규 노출 문자열 전부 한국어 — 라벨 `자기소개`, placeholder,
  카운터 `N/500자`, 저장 실패·불러오기 실패 안내 ([contracts/mypage-introduction-ui.md](./contracts/mypage-introduction-ui.md)에 확정 문구 기재).
- [x] **원칙 IV — 단순성 (YAGNI)**: 스토어(`lib/store.tsx`) 미변경, 인증 미변경, 신규 추상화 없음.
  서버 라우트 1개 도입은 불가피한 복잡성 — 아래 Complexity Tracking에 정당화.
- [x] **원칙 V — 문서·코드 동기화**: DESIGN.md §4.6 갱신을 구현과 같은 작업 단위에 포함.
  spec/plan 산출물도 코드와 어긋나지 않게 유지.

**Post-Phase 1 재점검**: 설계 산출물(data-model, contracts, quickstart) 확정 후 재검토 — 위반 없음 유지.

## Project Structure

### Documentation (this feature)

```text
specs/002-profile-introduction/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── introduction-api.md
│   └── mypage-introduction-ui.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
app/
├── api/
│   └── profile/
│       └── introduction/
│           ├── route.ts          # 신규: GET/PUT Route Handler (서비스 롤 키, 서버 전용)
│           └── route.test.ts     # 신규: 라우트 계약 테스트 (fetch 모킹)
└── (app)/
    └── mypage/
        ├── page.tsx              # 수정: 자기소개 영역(라벨·textarea·카운터·오류/로딩 상태) + 저장 연동
        └── page.test.tsx         # 신규: 마이페이지 UI 테스트 (RTL)

lib/
├── chars.ts                      # 기존: countChars 재사용 (수정 없음)
├── introduction.ts               # 신규: 클라이언트 fetch 헬퍼 + normalizeIntroduction + 한도 검사
└── introduction.test.ts          # 신규: 헬퍼 단위 테스트

.env.example                      # 수정: SUPABASE_SERVICE_ROLE_KEY 항목 추가 (.env.local은 훅 차단 — 사용자가 직접)
DESIGN.md                         # 수정: §4.6 자기소개 필드 명세 추가 (같은 작업 단위)
package.json                      # 수정: @supabase/supabase-js 의존성 추가
```

**Structure Decision**: 기존 단일 Next.js App Router 구조를 유지한다. 신규는
Route Handler 1개와 lib 헬퍼 1개뿐이며, 상태는 마이페이지 컴포넌트 로컬로
한정한다(스토어 미변경). 테스트는 소스 옆 콜로케이션(헌법 기술 스택 규칙).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 서버 Route Handler + 서비스 롤 키 도입 (클라이언트 직접 연결 대비 계층 1개 추가) | `profile` RLS가 `authenticated` 전용(`auth.uid() = user_id`)인데 앱은 모의 인증이라 Supabase 세션이 없음 → anon 키로는 introduction 조회/수정이 전부 차단됨 | ① 클라이언트 anon 직접 접근 — RLS에 막혀 동작 불가. ② RLS 정책 추가/완화 — 사용자가 "내가 만든 DB는 변경하면 안돼"로 명시 금지. ③ 실제 Supabase Auth 도입 — 로그인 흐름 전면 교체로 범위 밖이며 FR-009(기존 기능 불변) 위반 |
