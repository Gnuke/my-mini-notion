# Implementation Plan: 사이드바 접기/펼치기

**Branch**: `002-sidebar-collapse` | **Date**: 2026-07-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-sidebar-collapse/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

업무 화면(`/`)에서 사이드바 전체(아이콘 레일 60px + 글 목록 패널 256px)를
토글 버튼 하나로 접고 펼친다. 레일 렌더링을 앱 셸(`(app)/layout.tsx`)에서
각 페이지로 옮겨 업무 페이지가 `collapsed` 로컬 상태를 소유하게 하고,
접힘 시 `IconRail`이 토글 버튼만 남긴 60px 스트립 모드로 전환되며,
`PostList`는 **마운트를 유지한 채 표시만 숨겨**(검색어 등 로컬 상태 보존 —
FR-005) 편집 영역이 나머지 폭 전체를 차지한다. 마이 페이지는 프롭 없는
`<IconRail />`을 직접 렌더해 토글 없이 항상 표시된다(FR-009).
전환 모션 없음(FR-010), 상태 비영속(새로고침 시 펼침 기본). 신규 패키지·
스토어 변경·새 스타일 값 없음.

## Technical Context

**Language/Version**: TypeScript 5.5 (strict), React 18.3, Next.js 14.2 (App Router)

**Primary Dependencies**: 기존 의존성만 사용. 신규 아이콘 2종
(`PanelLeftCloseIcon`/`PanelLeftOpenIcon`)은 기존 관례대로 lucide 동명
아이콘의 인라인 SVG로 `components/icons.tsx`에 추가 — 신규 패키지 불필요

**Storage**: N/A — 접힘/펼침 상태는 비영속(Clarifications 확정).
localStorage 스키마(`mini-nook-v1`) 변경 없음

**Testing**: Vitest 4 + React Testing Library + jsdom (`npm test`), 셋업
`vitest.setup.ts`, 콜로케이션. `next/navigation` 훅(useRouter/usePathname)만
최소 모킹(프레임워크 런타임 부재로 불가피 — [research.md](./research.md) R7)

**Target Platform**: 모던 브라우저 (기존 Nook 지원 범위와 동일)

**Project Type**: Next.js 웹 앱 (단일 프로젝트, 클라이언트 컴포넌트)

**Performance Goals**: 토글은 표시 전환(조건부 렌더/display 전환)뿐이므로
즉시 완료 (SC-002 — 모션 없음, 레이아웃 재계산 1회)

**Constraints**: 헌법 II — 스타일 값은 DESIGN.md의 기존 토큰·기록된 리터럴만
사용 (60px 레일 폭, 34×34 RailButton, `--radius-md`, `--surface-sidebar`,
`--duration-fast` 등). 헌법 IV — 컨텍스트·영속화·모션·설정 옵션 없음

**Scale/Scope**: 수정 파일 5개(`(app)/layout.tsx`, `(app)/page.tsx`,
`(app)/mypage/page.tsx`, `components/IconRail.tsx`, `components/icons.tsx`),
신규 테스트 파일 2개, DESIGN.md 3개 섹션 갱신

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Gates from `.specify/memory/constitution.md` (v1.0.0):

- [x] **원칙 I — TDD (NON-NEGOTIABLE)**: 계획이 superpowers `/test-driven-development` 절차를 전제로 하는가?
  모든 구현 작업이 "실패 테스트 먼저(Red) → 최소 구현(Green) → 리팩터(Refactor)" 순서로 배치 가능한가?
  테스트는 Vitest + React Testing Library(`npm test`)를 사용하는가?
  → **통과.** `components/IconRail.test.tsx`(토글 버튼 렌더·라벨·스트립 모드) →
  IconRail 수정, `app/(app)/page.test.tsx`(접기/펼치기 동작·상태 보존·기본값) →
  page/layout 수정 순서로 배치. 실제 스토어(NookProvider) 사용, 모킹은
  `next/navigation`만(불가피 — research R7).
- [x] **원칙 II — 디자인 명세 단일 출처**: UI 변경이 포함되면 `DESIGN.md`를 먼저 읽고 토큰·리터럴 값을 따르는 계획인가?
  코드와 명세 불일치 발견 시 임의 수정 없이 보고하는가?
  → **통과.** DESIGN.md 전문을 읽었고(2026-07-16), 이 기능 관련 신규 불일치 없음
  (`--sidebar-width` 260px 미사용 vs 실제 256px 하드코딩은 DESIGN.md §2.4에 이미
  기록된 알려진 사항 — 본 기능은 해당 토큰을 건드리지 않음). 신규 UI는 기존
  값만 조합: 스트립 = 기존 레일 컨테이너(60px, `--surface-sidebar`,
  `--border-subtle`, padding 12px 0) 재사용, 토글 버튼 = 기존 RailButton
  (34×34, `--radius-md`, hover `--surface-hover`) 재사용, 아이콘 = lucide 동명
  19px(기존 관례). 새 임의 값 없음 — 상세는 [research.md](./research.md) R4·R5.
  DESIGN.md에 없는 신규 배치 결정(토글 버튼을 레일 최상단에 배치, 아이콘 이름)은
  본 plan 검토로 사용자 확인을 받고, 구현과 같은 작업 단위로 DESIGN.md에 명세를
  추가한다.
- [x] **원칙 III — 한국어 UI**: 새로 추가되는 사용자 노출 문자열이 모두 한국어인가?
  → **통과.** 노출 문자열은 토글 버튼의 title/aria-label 두 가지뿐 —
  "사이드바 접기"(펼침 상태), "사이드바 펼치기"(접힘 상태).
- [x] **원칙 IV — 단순성 (YAGNI)**: 현재 요구사항 이상의 추상화·옵션을 만들지 않는가?
  불가피한 복잡성은 아래 Complexity Tracking에 정당화했는가?
  → **통과.** `useState` 하나 + IconRail 프롭 2개 + 아이콘 2개. React 컨텍스트·
  localStorage 영속·전환 모션·신규 컴포넌트 파일 없음. 레일 렌더 위치 이동은
  상태 공유를 위한 최소 구조 변경(컨텍스트 신설보다 단순 — research R1).
  위반 없음 → Complexity Tracking 비어 있음.
- [x] **원칙 V — 문서·코드 동기화**: 디자인·명세 문서 갱신이 같은 작업 단위에 포함되어 있는가?
  → **통과.** DESIGN.md §3.2(앱 셸/레이아웃)·§4.1(IconRail: 구성 순서, 토글
  버튼, 스트립 모드)·§4.7(아이콘 표 2종 추가)·§5(인터랙션 플로우) 갱신을
  구현과 같은 작업 단위로 배치(quickstart 체크 항목 포함).

**Post-Design 재평가 (Phase 1 산출물 작성 후)**: 위 5개 게이트 모두 유지 —
설계 산출물(research/data-model/contracts/quickstart)이 새 의존성·새 임의
스타일 값·영어 UI 문자열·불필요한 추상화를 도입하지 않음을 확인함.

## Project Structure

### Documentation (this feature)

```text
specs/002-sidebar-collapse/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── sidebar-collapse-ui.md   # UI 계약 (토글·스트립·상태 보존 규칙)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
app/(app)/
├── layout.tsx           # [수정] AppShell에서 <IconRail /> 제거 (레일 렌더를 페이지로 이양)
├── page.tsx             # [수정] collapsed useState 소유, IconRail에 프롭 전달,
│                        #        PostList를 마운트 유지한 채 숨김, 하이드레이션 분기에도 레일 렌더
├── page.test.tsx        # [신규] 접기/펼치기 동작 테스트 (테스트 먼저 작성)
└── mypage/
    └── page.tsx         # [수정] 프롭 없는 <IconRail /> 직접 렌더 (토글 버튼 없음 — FR-009)

components/
├── IconRail.tsx         # [수정] collapsed?/onToggleSidebar? 프롭 추가,
│                        #        토글 버튼(레일 최상단), 접힘 시 토글만 남긴 스트립 모드
├── IconRail.test.tsx    # [신규] 토글 버튼 렌더·라벨·스트립 모드 테스트 (테스트 먼저 작성)
└── icons.tsx            # [수정] PanelLeftCloseIcon·PanelLeftOpenIcon 추가 (lucide 동명, 19px)

DESIGN.md                # [수정] §3.2·§4.1·§4.7·§5 갱신 (같은 작업 단위)
```

**Structure Decision**: 기존 단일 Next.js 앱 구조를 그대로 사용한다. 접힘
상태는 업무 페이지 전용(FR-009)이므로 `(app)/page.tsx`의 로컬 `useState`가
단일 소유자가 되도록, 공용 레이아웃에 있던 `<IconRail />` 렌더를 두 페이지로
내린다(컨텍스트 신설 대비 단순 — research R1). `PostList`는 언마운트하면
검색어(컴포넌트 로컬 상태)가 초기화되어 FR-005를 위반하므로 숨김 래퍼로
마운트를 유지한다(research R3).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

위반 없음 — 해당 사항 없음.
