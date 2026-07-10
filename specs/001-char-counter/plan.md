# Implementation Plan: 본문 글자 수 카운터

**Branch**: `001-char-counter` | **Date**: 2026-07-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-char-counter/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

에디터 본문(`components/Editor.tsx`의 textarea)에 입력된 텍스트의 글자 수를
사용자 인지 글자 단위(grapheme)로 계산해, 에디터 영역 우측 하단에 고정(플로팅)된
작은 배지로 실시간 표시한다. 순수 계산 함수 `countChars()`를 `lib/`에 추가하고
(`Intl.Segmenter` 기반), Editor 내부에 절대 위치 배지를 렌더한다. 카운터는
Editor 내부에 있으므로 글 미선택(빈 상태) 시 자동으로 표시되지 않는다.
데이터 모델·저장소 변경 없음.

## Technical Context

**Language/Version**: TypeScript 5.5 (strict), React 18.3, Next.js 14.2 (App Router)

**Primary Dependencies**: 기존 의존성만 사용. 글자 수 계산은 플랫폼 내장
`Intl.Segmenter` (Node 18+/모던 브라우저 내장 — 신규 패키지 불필요)

**Storage**: N/A — 글자 수는 `Post.body`에서 파생되는 표시용 값. localStorage
스키마(`mini-nook-v1`) 변경 없음

**Testing**: Vitest 4 + React Testing Library + jsdom (`npm test`), 셋업
`vitest.setup.ts`, 콜로케이션 (`lib/*.test.ts`, `components/*.test.tsx`)

**Target Platform**: 모던 브라우저 (기존 Nook 지원 범위와 동일)

**Project Type**: Next.js 웹 앱 (단일 프로젝트, 클라이언트 컴포넌트)

**Performance Goals**: 키 입력마다 재계산해도 체감 지연 없음 (SC-001/SC-003 —
수만 자 본문에서 grapheme 계산은 수 ms 수준, `useMemo`로 본문 변경 시에만 재계산)

**Constraints**: 헌법 IV(YAGNI) — 옵션·설정 없는 최소 구현. 헌법 II —
스타일 값은 DESIGN.md의 기존 토큰·기록된 리터럴 패턴만 사용

**Scale/Scope**: 화면 1곳(에디터), 신규 순수 함수 1개, Editor 수정 1건,
테스트 파일 2개, DESIGN.md 1개 섹션 갱신

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Gates from `.specify/memory/constitution.md` (v1.0.0):

- [x] **원칙 I — TDD (NON-NEGOTIABLE)**: 계획이 superpowers `/test-driven-development` 절차를 전제로 하는가?
  모든 구현 작업이 "실패 테스트 먼저(Red) → 최소 구현(Green) → 리팩터(Refactor)" 순서로 배치 가능한가?
  테스트는 Vitest + React Testing Library(`npm test`)를 사용하는가?
  → **통과.** `lib/chars.test.ts`(순수 함수) → `lib/chars.ts`, `components/Editor.test.tsx`(UI 동작)
  → Editor 수정 순서로 배치. 모킹 불필요(jsdom localStorage + 실제 스토어 사용).
- [x] **원칙 II — 디자인 명세 단일 출처**: UI 변경이 포함되면 `DESIGN.md`를 먼저 읽고 토큰·리터럴 값을 따르는 계획인가?
  코드와 명세 불일치 발견 시 임의 수정 없이 보고하는가?
  → **통과.** DESIGN.md 전문을 읽었고(2026-07-10), 이 기능 관련 코드·명세 불일치 없음.
  신규 배지는 기존 토큰(`--text-tertiary`, `--border-subtle`, `--radius-sm`)과
  DESIGN.md에 기록된 리터럴 패턴(coverBtnStyle의 `rgba(255,255,255,.92)`, 우하단 offset 18/12px,
  탑바 저장 표시 12px)만 조합한다. 새 임의 값 없음 — 상세는 [research.md](./research.md) R3.
- [x] **원칙 III — 한국어 UI**: 새로 추가되는 사용자 노출 문자열이 모두 한국어인가?
  → **통과.** 노출 문자열은 `{N}자` 형식 하나뿐 (예: "128자").
- [x] **원칙 IV — 단순성 (YAGNI)**: 현재 요구사항 이상의 추상화·옵션을 만들지 않는가?
  불가피한 복잡성은 아래 Complexity Tracking에 정당화했는가?
  → **통과.** 순수 함수 1개 + Editor 내 span 1개. 별도 컴포넌트 파일·옵션·설정·디바운스 없음.
  위반 없음 → Complexity Tracking 비어 있음.
- [x] **원칙 V — 문서·코드 동기화**: 디자인·명세 문서 갱신이 같은 작업 단위에 포함되어 있는가?
  → **통과.** DESIGN.md §4.3(Editor)에 글자 수 배지 명세 추가를 구현과 같은 작업 단위로 배치(quickstart 체크 항목 포함).

**Post-Design 재평가 (Phase 1 산출물 작성 후)**: 위 5개 게이트 모두 유지 — 설계
산출물(research/data-model/contracts/quickstart)이 새 의존성·새 임의 스타일 값·
영어 UI 문자열·불필요한 추상화를 도입하지 않음을 확인함.

## Project Structure

### Documentation (this feature)

```text
specs/001-char-counter/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── char-counter-ui.md   # UI 계약 (표시 규칙·형식·가시성)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
lib/
├── chars.ts             # [신규] countChars(text) — grapheme 단위 글자 수 순수 함수
├── chars.test.ts        # [신규] countChars 단위 테스트 (테스트 먼저 작성)
├── data.ts              # 변경 없음
└── store.tsx            # 변경 없음

components/
├── Editor.tsx           # [수정] 우측 하단 플로팅 글자 수 배지 추가 (root에 position:relative)
└── Editor.test.tsx      # [신규] 카운터 UI 동작 테스트 (테스트 먼저 작성)

DESIGN.md                # [수정] §4.3 Editor에 글자 수 배지 명세 추가 (같은 작업 단위)
```

**Structure Decision**: 기존 단일 Next.js 앱 구조를 그대로 사용한다. 계산 로직은
`lib/`의 순수 모듈(테스트 콜로케이션), UI는 기존 `components/Editor.tsx`에
인라인 추가 — 신규 컴포넌트 파일을 만들 만큼의 복잡도가 없다(원칙 IV).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

위반 없음 — 해당 사항 없음.
