# Implementation Plan: 랜덤 고양이 커버 이미지

**Branch**: `002-cat-cover-image` | **Date**: 2026-07-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-cat-cover-image/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

글을 열거나 전환할 때마다 cataas 오픈 API(`https://cataas.com/api/cats?tags=cute`)에서
랜덤 고양이 사진을 받아 에디터 제목 입력창 위 전체 폭 커버 밴드(높이 150px)에 표시한다.
로딩 동안에는 같은 크기의 스켈레톤 UI(스피너 금지)를 보여 레이아웃 이동을 막고, 실패 시
커버 영역을 조용히 숨긴다. 기존 그라데이션 커버 기능(커버 추가·변경·삭제, `Post.cover`
저장)은 전면 제거한다(clarify Q3, FR-010).

기술 접근: 새 클라이언트 컴포넌트 `components/CatCover.tsx`가 fetch 상태 머신
(`loading → ready | error`)을 관리하고, 순수 헬퍼(`lib/catCover.ts`)가 응답 파싱과
랜덤 선택을 담당한다. 글 전환 시 `AbortController`로 이전 요청을 취소해 늦게 도착한
응답이 새 글의 커버를 덮어쓰지 않게 한다(FR-008). 신규 코드는 전부 TDD(Vitest + RTL)로
작성한다.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), React 18.3, Next.js 14.2 (App Router)

**Primary Dependencies**: 신규 의존성 없음 — 브라우저 내장 `fetch` + `AbortController`,
플레인 `<img>` 태그 사용 (next/image는 외부 도메인 설정이 필요해 YAGNI로 배제)

**Storage**: N/A — 커버는 저장하지 않는 표시용 값(clarify Q1). 기존 localStorage
(`mini-nook-v1`)의 `cover` 필드는 더 이상 읽지 않으며 타입에서 제거(FR-010)

**Testing**: Vitest 4 + React Testing Library + jsdom (`npm test`), fetch는 테스트에서
`vi.stubGlobal`로 모킹하되 실측한 실제 응답 구조 전체를 반영(헌법 I 모킹 규칙)

**Target Platform**: 모던 브라우저 (클라이언트 컴포넌트, CSR 상태)

**Project Type**: Next.js 웹 앱 단일 프로젝트 (기존 구조 유지)

**Performance Goals**: 커버 영역(스켈레톤)은 글 열람 즉시 표시, 정상 네트워크에서 5초
이내 이미지 표시(SC-001), 스켈레톤→이미지 교체 시 레이아웃 이동 0(SC-003)

**Constraints**: 스피너 사용 금지(SC-002) · 외부 API 장애가 편집을 차단하면 안 됨(SC-004)
· CORS: cataas가 `Access-Control-Allow-Origin: *` 응답 확인(2026-07-13 실측)

**Scale/Scope**: 단일 사용자 로컬 앱, 화면 1곳(에디터), 신규 컴포넌트 1개 + 헬퍼 1개
+ 기존 파일 4곳 수정(Editor, data, store, globals.css) + DESIGN.md 동기화

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Gates from `.specify/memory/constitution.md` (v1.0.0):

- [x] **원칙 I — TDD (NON-NEGOTIABLE)**: 모든 신규 동작(헬퍼 파싱·랜덤 선택, 스켈레톤
  표시, 성공 렌더, 실패 숨김, 글 전환 레이스, Editor 통합)을 실패 테스트 먼저 작성 →
  최소 구현 → 리팩터 순서로 배치한다. 기존 커버 기능 제거도 Editor 테스트 갱신(RED)
  후 수행한다. 테스트는 Vitest + RTL(`npm test`). fetch 모킹은 불가피한 외부 경계
  1곳으로 한정하고, 모의 응답은 2026-07-13 실측 응답 구조 전체를 사용한다.
- [x] **원칙 II — 디자인 명세 단일 출처**: `DESIGN.md`를 이번 세션에서 Read 도구로
  직접 읽었다. 커버 밴드 치수(150px), radius·색 토큰, 이모지 겹침(-44px) 등 기존
  리터럴을 그대로 따른다. 스켈레톤은 DESIGN.md에 없는 신규 요소이므로 기존 토큰
  (`--surface-hover`)만으로 설계하고 §4.3에 신규 기록한다(research.md R4 참조).
  코드-문서 불일치는 발견되지 않았다.
- [x] **원칙 III — 한국어 UI**: 신규 노출 문자열은 이미지 `alt="랜덤 고양이 커버"`,
  스켈레톤 `aria-label="커버 이미지 불러오는 중"` 2건이며 모두 한국어다.
- [x] **원칙 IV — 단순성 (YAGNI)**: 재시도·캐싱·커버 저장·이미지 최적화·설정 옵션을
  만들지 않는다. 제거되는 기존 커버 코드(COVERS, CoverKey, 피커 팝오버, coverBtnStyle)는
  죽은 코드로 남기지 않고 삭제한다. Complexity Tracking 위반 없음.
- [x] **원칙 V — 문서·코드 동기화**: DESIGN.md §4.3(커버 섹션 교체, 스켈레톤 신규 기록),
  §2.5(스켈레톤 keyframes 애니메이션 추가), §5(플로우의 커버 편집 항목 갱신)를 구현과
  같은 작업 단위에 포함한다(tasks.md에 태스크로 명시 예정).

*Post-design re-check (Phase 1 완료 후)*: 위 5개 게이트 모두 유지 — 설계 산출물
(data-model, contracts, quickstart)에 원칙 위반 요소 없음.

## Project Structure

### Documentation (this feature)

```text
specs/002-cat-cover-image/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── cataas-api.md    # 외부 API 계약 (실측 기반)
│   └── cat-cover-ui.md  # CatCover 컴포넌트 UI 계약
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
app/
├── globals.css          # [수정] 스켈레톤 keyframes(nk-skeleton-pulse) 추가
└── (app)/…              # 변경 없음

components/
├── CatCover.tsx         # [신규] 커버 컴포넌트 (fetch 상태 머신 + 스켈레톤/이미지/숨김)
├── CatCover.test.tsx    # [신규] 컴포넌트 테스트 (스켈레톤·성공·실패·레이스·콜백)
├── Editor.tsx           # [수정] 기존 커버 UI 제거, CatCover 장착, 이모지 마진 연동
└── Editor.test.tsx      # [수정] cover 픽스처 제거, 커버 교체 통합 테스트 추가

lib/
├── catCover.ts          # [신규] CAT_API_URL, CatItem 타입, pickRandomCatUrl 순수 헬퍼
├── catCover.test.ts     # [신규] 헬퍼 단위 테스트
├── data.ts              # [수정] CoverKey·COVERS·Post.cover·시드 cover 제거
├── data.test.ts         # [수정] 영향 범위 확인·갱신
└── store.tsx            # [수정] 새 글 생성 시 cover: null 제거

DESIGN.md                # [수정] §4.3 커버 섹션 교체, §2.5 모션, §5 플로우 동기화
```

**Structure Decision**: 기존 단일 Next.js 앱 구조를 그대로 사용한다. 신규 파일은
관례(컴포넌트는 `components/`, 순수 로직은 `lib/`, 테스트는 소스 옆 콜로케이션)를
따르며 새 디렉터리를 만들지 않는다.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

위반 없음 — 해당 없음.
