# Implementation Plan: 다크 모드

**Branch**: `002-dark-mode` | **Date**: 2026-07-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-dark-mode/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

다크/라이트 2모드 테마를 도입한다. `<html data-theme="dark|light">` 속성과
`app/globals.css`의 시맨틱 토큰 오버라이드로 화면 전체를 전환하고, 글 목록
패널 상단 헤더의 토글 버튼으로 즉시 전환한다. 기본값은 다크(OS 설정 무시),
선택은 localStorage `nook-theme`에 저장하며, SSR 기본 다크 + `<head>` 인라인
스크립트로 로드 시 깜빡임(FOUC)을 방지한다. 다크 팔레트는 Notion 다크 모드를
레퍼런스로 Nook 토큰 구조에 이식하고 `DESIGN.md`에 같은 작업 단위로 기록한다.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 18, Next.js 14 App Router

**Primary Dependencies**: 기존 의존성만 사용 — 신규 패키지 없음.
테마는 CSS 커스텀 프로퍼티 + DOM 속성으로 구현

**Storage**: localStorage — 신규 키 `nook-theme` (`"dark" | "light"`).
기존 키 패턴(`nook-auth`, `mini-nook-v1`)을 따름

**Testing**: Vitest 4 + React Testing Library + jsdom (`npm test`),
셋업 `vitest.setup.ts`, 콜로케이션 `*.test.ts(x)`

**Target Platform**: 모던 브라우저 (데스크톱 중심, 반응형 분기 없음 — 기존과 동일)

**Project Type**: 단일 Next.js 웹 앱 (App Router, 클라이언트 컴포넌트 중심)

**Performance Goals**: 토글 클릭 → 1초 이내 전체 전환(SC-002; CSS 변수 스왑은
단일 리페인트로 사실상 즉시), 로드 시 반대 모드 플래시 0회(SC-004)

**Constraints**: 다크 기본값이 OS `prefers-color-scheme`보다 우선(FR-004) —
미디어쿼리 기반 테마 사용 불가. 모든 사용자 노출 문자열 한국어(헌법 III).
색 값은 DESIGN.md 단일 출처(헌법 II)

**Scale/Scope**: 화면 4종(로그인·목록·에디터·마이페이지), 컴포넌트 5개,
시맨틱 토큰 오버라이드 약 19개 + 신규 시맨틱 토큰 3개 + 신규 아이콘 2개

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Gates from `.specify/memory/constitution.md` (v1.0.0):

- [x] **원칙 I — TDD (NON-NEGOTIABLE)**: 모든 동작(기본 다크, 토글, 저장,
  폴백)은 Vitest + RTL 실패 테스트를 먼저 작성한 뒤 구현한다. 태스크 생성 시
  테스트 태스크를 대응 구현 태스크 앞에 배치한다. CSS 토큰 값 자체는 jsdom에서
  스타일시트를 로드하지 않으므로 테스트 대상은 동작(속성 전환·영속·기본값)
  중심으로 하고, 시각 값은 DESIGN.md 대조 + quickstart 수동 검증으로 확인한다.
- [x] **원칙 II — 디자인 명세 단일 출처**: `DESIGN.md` 전체를 Read 도구로
  읽고 계획에 반영했다(2026-07-16). 다크 팔레트는 DESIGN.md에 "미구현"으로
  명시된 항목이며, 사용자가 명확화에서 Notion 다크 모드 레퍼런스 방식을
  승인했다. 확정 값은 research.md에 제안하고 구현 시 DESIGN.md에 기록한다.
  코드↔DESIGN.md 불일치는 발견되지 않았다.
- [x] **원칙 III — 한국어 UI**: 신규 노출 문자열은 토글 버튼의
  `title`/`aria-label`("다크 모드로 전환"/"라이트 모드로 전환")뿐이며 한국어다.
- [x] **원칙 IV — 단순성 (YAGNI)**: 시스템 모드·테마 컨텍스트 프레임워크·
  신규 의존성 없이 DOM 속성 + CSS 오버라이드만 사용. 신규 시맨틱 토큰은
  다크에서 시각적으로 깨지는 직접 리터럴 3곳을 치환하는 최소한(3개)만 추가.
- [x] **원칙 V — 문서·코드 동기화**: DESIGN.md 갱신(다크 토큰 표, 토글 버튼
  명세, 신규 토큰·아이콘, §6 다크 모드 항목)을 구현과 같은 작업 단위의
  태스크로 포함한다.

**Post-Phase 1 re-check (2026-07-16)**: 설계 산출물(research.md,
data-model.md, contracts/, quickstart.md) 작성 후 재평가 — 위반 없음.
Complexity Tracking 기록 불필요.

## Project Structure

### Documentation (this feature)

```text
specs/002-dark-mode/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── theme-contract.md  # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
app/
├── globals.css          # [수정] html[data-theme="dark"] 토큰 오버라이드 블록,
│                        #        신규 시맨틱 토큰 3개, 다크 스크롤바 규칙
├── layout.tsx           # [수정] <html data-theme="dark"> 기본값 +
│                        #        FOUC 방지 인라인 스크립트 + themeColor
├── (app)/               # (변경 없음 — 토큰 경유로 자동 적용)
└── login/               # (변경 없음 — 토큰 경유로 자동 적용)

lib/
├── theme.ts             # [신규] Theme 타입, THEME_KEY, getInitialTheme,
│                        #        applyTheme, FOUC 스크립트 문자열 (서버 안전)
├── use-theme.ts         # [신규] useTheme 훅 ("use client" — React 훅은
│                        #        서버 모듈 그래프에 못 들어가 분리)
├── theme.test.ts        # [신규] 기본값·저장·폴백·토글 단위 테스트
└── data.ts              # (변경 없음)

components/
├── PostList.tsx         # [수정] 헤더에 모드 전환 토글 버튼 추가
├── PostList.test.tsx    # [신규] 토글 렌더·클릭 전환·라벨 테스트
├── Editor.tsx           # [수정] rgba(255,255,255,.92) 리터럴 3곳 →
│                        #        var(--surface-overlay), --red-50 → --danger-subtle,
│                        #        --blue-700 → --tile-blue-text
├── IconRail.tsx         # [수정] 아바타 이니셜 --blue-700 → --tile-blue-text
├── icons.tsx            # [수정] SunIcon, MoonIcon 추가 (Lucide 스타일)
└── ...

app/(app)/mypage/page.tsx  # [수정] 아바타 이니셜 --blue-700 → --tile-blue-text

DESIGN.md                # [수정] 다크 팔레트 표·토글 버튼 명세·신규 토큰/아이콘 기록
```

**Structure Decision**: 기존 단일 Next.js 프로젝트 구조를 그대로 사용한다.
신규 파일은 `lib/theme.ts`(+테스트), `components/PostList.test.tsx`뿐이며
나머지는 기존 파일의 최소 수정이다. 인라인 스타일이 이미 CSS 변수를 참조하므로
컴포넌트 구조 변경 없이 토큰 오버라이드로 전환이 전파된다.

## Complexity Tracking

> 위반 없음 — 기록할 항목 없음.
