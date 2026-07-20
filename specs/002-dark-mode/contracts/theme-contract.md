# UI Contract: 테마 (002-dark-mode)

**Date**: 2026-07-16 | **Plan**: [../plan.md](../plan.md)

앱이 노출하는 테마 관련 계약. 테스트(`lib/theme.test.ts`,
`components/PostList.test.tsx`)는 이 계약을 검증한다.

## C1. 저장소 계약 (localStorage)

| 항목 | 계약 |
| --- | --- |
| 키 | `nook-theme` |
| 유효 값 | `"dark"`, `"light"` (그 외는 쓰지 않는다) |
| 읽기 판정 | 값 === `"light"` → 라이트. 그 외 전부(부재·무효·예외) → 다크 |
| 쓰기 시점 | 토글 클릭 시에만 현재 모드를 저장 |
| 예외 | 접근 불가 시 읽기=다크 폴백, 쓰기=무시 (throw 금지) |

## C2. DOM 계약

| 항목 | 계약 |
| --- | --- |
| 속성 | `<html data-theme="dark" \| "light">` |
| SSR 기본값 | `data-theme="dark"` (layout.tsx 마크업에 고정) |
| 페인트 전 보정 | `<head>` 동기 스크립트가 저장값 `"light"`일 때만 속성을 `light`로 변경. 그 외에는 손대지 않는다 |
| 전환 | 토글 클릭 → 속성 즉시 반전 (새로고침·리라우팅 없음) |
| CSS 결합점 | `html[data-theme="dark"] { … }` 블록만 다크 값을 정의. 라이트 값은 기존 `:root` 그대로 |

## C3. 모듈 계약 (`lib/theme.ts` + `lib/use-theme.ts`)

```ts
// lib/theme.ts — 서버 안전 모듈 (React 임포트 없음; 서버 레이아웃이 임포트)
export type Theme = "dark" | "light";
export const THEME_KEY = "nook-theme";
export const DEFAULT_THEME: Theme = "dark";
export const THEME_INIT_SCRIPT: string; // C2 페인트 전 보정 스크립트 본문
export function getInitialTheme(): Theme; // C1 읽기 판정
export function applyTheme(theme: Theme): void; // C2 속성 + C1 저장

// lib/use-theme.ts — "use client" 훅 모듈 (React 훅은 서버 모듈 그래프에
// 들어갈 수 없어 분리 — Next.js 빌드 제약, 2026-07-16 구현 중 확인)
export function useTheme(): { theme: Theme; toggle: () => void };
```

- `getInitialTheme`는 SSR(window 부재) 환경에서 `DEFAULT_THEME`을 반환한다.
- `useTheme().toggle`은 상태·DOM·저장소를 원자적으로(같은 핸들러 안에서) 갱신한다.

## C4. 토글 버튼 계약 (PostList 헤더)

| 항목 | 계약 |
| --- | --- |
| 위치 | 글 목록 패널 헤더, `＋ 새 글` 버튼 왼쪽 (우측 그룹) |
| 요소 | `<button>` 28×28px, 아이콘 전용 |
| 다크일 때 | `SunIcon` 표시, `title`/`aria-label` = `라이트 모드로 전환` |
| 라이트일 때 | `MoonIcon` 표시, `title`/`aria-label` = `다크 모드로 전환` |
| 클릭 | 모드 반전 (C1·C2 갱신) — 그 외 부수효과 없음 |
| 스타일 | 배경 default `transparent` / hover `var(--surface-hover)`; 아이콘 색 `var(--text-tertiary)`; radius `var(--radius-sm)`; `transition: background var(--duration-fast) var(--ease-standard)` |

## C5. 접근성·현지화 계약

- 사용자 노출 문자열(라벨·툴팁)은 한국어만 사용한다 (헌법 III).
- 아이콘 SVG는 `aria-hidden` 처리하고 접근 가능한 이름은 버튼의
  `aria-label`이 제공한다.
- 두 모드 모두 본문 텍스트 대비 WCAG AA(4.5:1) 이상 (research.md R4 값 기준).

## C6. 비회귀 계약

- 기존 localStorage 키(`mini-nook-v1`, `nook-auth`)를 읽거나 쓰지 않는다.
- `NookStore` 인터페이스는 변경하지 않는다.
- 라이트 모드의 기존 시각 값(DESIGN.md §2~4)은 변경하지 않는다 — 단,
  research.md R5의 리터럴 → 토큰 치환은 라이트에서 동일 값으로 렌더된다.
