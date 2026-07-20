# Data Model: 다크 모드 (002-dark-mode)

**Date**: 2026-07-16 | **Plan**: [plan.md](./plan.md)

## 엔티티 1: 테마 선호 (Theme Preference)

사용자가 마지막으로 선택한 화면 모드. 이 기능의 유일한 영속 데이터.

| 속성 | 내용 |
| --- | --- |
| 타입 | `Theme = "dark" \| "light"` (`lib/theme.ts`) |
| 저장소 | localStorage, 키 `nook-theme` (`THEME_KEY`) |
| 저장 단위 | 브라우저(기기) 단위 — 계정과 무관 (spec Assumptions) |
| 기본값 | `"dark"` (`DEFAULT_THEME`) — 저장값 없음/유효하지 않음/접근 불가 시 |
| 유효성 규칙 | 저장된 문자열이 정확히 `"light"`일 때만 라이트. 그 외 모든 값(`null`, `"DARK"`, `"auto"`, 손상 JSON 등)은 다크로 해석 (FR-004, FR-006) |
| 쓰기 시점 | 토글 클릭(`applyTheme`) 시에만. 읽기 전용 방문(전환 안 함)은 저장소에 쓰지 않는다 |
| 예외 처리 | localStorage 접근 예외(비활성·용량) 시 try/catch로 무시 — 읽기는 다크 폴백, 쓰기는 조용히 실패(세션 내 전환은 DOM 속성으로 계속 동작) — `lib/auth.ts` 패턴 동일 |

### 상태 전이

```
                  ┌─────────── toggle ───────────┐
                  ▼                              │
  [저장값 없음/무효] ──초기화──▶ dark ◀──── toggle ────▶ light
                                 ▲                        │
                                 └── 재방문(load) 시 저장값 복원 ──┘
```

- 초기화: `getInitialTheme()` — 위 유효성 규칙으로 결정
- 전환: `toggle` — `dark ↔ light` 반전, DOM 속성 + localStorage 동시 갱신
- 복원: 페이지 로드 시 `THEME_INIT_SCRIPT`(페인트 전) 및 React 훅 초기값이
  동일한 규칙으로 재계산 — 두 경로의 판정 로직은 반드시 같은 규칙을 따른다

## 엔티티 2: 테마 상태의 런타임 표현 (DOM)

영속 엔티티는 아니지만 화면 전환의 단일 진실 원천이다.

| 속성 | 내용 |
| --- | --- |
| 위치 | `document.documentElement`(`<html>`)의 `data-theme` 속성 |
| 값 | `"dark"` 또는 `"light"` (SSR 기본값: `"dark"`) |
| 소비자 | `app/globals.css`의 `html[data-theme="dark"]` 토큰 오버라이드 블록 |
| 갱신 주체 | (1) SSR 마크업 기본값, (2) `THEME_INIT_SCRIPT` (페인트 전 1회), (3) `useTheme().toggle` (클릭 시) |

## 파생 데이터: 다크 토큰 오버라이드

색 값 자체는 코드/DESIGN.md가 원천이므로 여기서는 구조만 정의한다.
확정 값 표는 [research.md R4·R5](./research.md) 및 구현 후 `DESIGN.md` 참조.

- 오버라이드 대상: 시맨틱 토큰 19개 (text 8, surface 7, border 3, tile 1)
- 신규 시맨틱 토큰 3개: `--surface-overlay`, `--tile-blue-text`,
  `--danger-subtle` — `:root`(라이트 값)와 다크 블록(다크 값) 양쪽에 정의
- 신규 전역 규칙 1개: 다크 스크롤바 thumb
- 불변: 프리미티브 램프 35개, 타이포·radius·그림자·모션 토큰, 커버 팔레트
  (`COVERS`), 액센트·포커스 토큰

## 기존 데이터와의 관계

- `NookData`(`mini-nook-v1`)·`AUTH_KEY`(`nook-auth`)와 독립된 별도 키 —
  기존 데이터 마이그레이션 불필요, 스키마 변경 없음
- `NookStore`는 테마를 알지 못한다 (research.md R3)
