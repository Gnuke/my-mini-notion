# Research: 본문 글자 수 카운터

**Feature**: 001-char-counter | **Date**: 2026-07-10

Technical Context에 NEEDS CLARIFICATION은 없으나, 구현 방식 선택지가 있는
지점을 조사해 결정을 기록한다.

## R1. 글자 수 계산 방식 (FR-004: 사용자 인지 글자 단위)

- **Decision**: 플랫폼 내장 `Intl.Segmenter("ko", { granularity: "grapheme" })`로
  grapheme cluster 수를 센다. `lib/chars.ts`의 순수 함수
  `countChars(text: string): number`로 캡슐화한다.
- **Rationale**:
  - 스펙 클래리파이에서 "사용자가 하나의 글자로 인지하는 단위"(조합 이모지
    👨‍👩‍👧·국기 = 1자)로 확정됨 — grapheme 분할이 정확히 이 정의다.
  - Node 18+(Vitest 실행 환경)와 모든 모던 브라우저(Firefox 125+ 포함, 2024~)에
    내장 — **신규 의존성 0개** (원칙 IV).
  - Segmenter 인스턴스는 모듈 스코프에 1회 생성해 재사용 (생성 비용 회피).
- **Alternatives considered**:
  - `str.length` (UTF-16 코드 유닛): 일반 이모지도 2자로 셈 — 클래리파이에서 기각된 C안.
  - `[...str].length` (코드 포인트): 조합 이모지·국기가 여러 자로 셈 — 기각된 B안.
  - `grapheme-splitter` 등 라이브러리: 내장 API로 충분한데 의존성 추가 — 원칙 IV 위반.

## R2. 재계산 전략 (SC-001/SC-003: 즉시 갱신 + 수만 자에서 지연 없음)

- **Decision**: `useMemo(() => countChars(active.body), [active.body])`로 본문이
  바뀐 렌더에서만 동기 재계산한다. 디바운스·워커·증분 계산은 도입하지 않는다.
- **Rationale**: grapheme 분할은 O(n)이며 50k자 수준에서 수 ms — 키 입력
  프레임 예산 내. 이미 키 입력마다 textarea 높이 재계산 + 전체 상태 갱신이
  일어나는 구조라 추가 부담이 지배적이지 않다. 가장 단순한 구현(원칙 IV).
- **Alternatives considered**:
  - 디바운스 표시: "즉시 갱신"(FR-002) 체감을 해치고 복잡도만 추가 — 기각.
  - Web Worker/증분 계산: 현재 규모에서 과잉 설계 — 기각. 실측으로 문제가
    확인되면 그때 도입(quickstart에 수만 자 수동 검증 시나리오 포함).

## R3. 배지 위치·스타일 (FR-003: 우측 하단 고정 플로팅, 원칙 II 준수)

- **Decision**: `Editor` 루트 div(이미 `height:100%` flex 컬럼)에
  `position: relative`를 추가하고, 배지를 `position: absolute; right: 18px;
  bottom: 12px`로 배치한다. 내부 스크롤 영역(`flex:1; overflow-y:auto`)과
  분리되어 있으므로 스크롤과 무관하게 항상 보인다(FR-003). 스타일은 DESIGN.md에
  이미 기록된 값만 조합:
  - 배경 `rgba(255,255,255,.92)` + 보더 `1px solid var(--border-subtle)` +
    `border-radius: var(--radius-sm)` + 패딩 `4px 9px` — **coverBtnStyle 패턴 재사용**
    (DESIGN.md §4.3 커버 버튼: 스크롤 콘텐츠 위에 뜨는 반투명 흰 배지의 기존 선례)
  - 글자: `font-size: 12px; color: var(--text-tertiary)` — 탑바 "자동 저장/저장됨 ✓"
    표시(12px, tertiary)와 동일한 보조 정보 위계
  - offset `right: 18px; bottom: 12px` — 커버 밴드 우하단 버튼 그룹(right 18,
    bottom 12)과 동일한 우하단 offset 선례
  - `pointer-events: none; user-select: none` — 순수 표시 요소로, 아래 textarea
    클릭·드래그를 가로막지 않음
  - z-index 미지정 — 팝오버 백드롭(z 10)·본체(z 20)보다 항상 아래 유지
- **Rationale**: 새 임의 값 없이 기존 토큰·기록된 리터럴 선례만 조합해 원칙 II를
  지킨다. 구현과 같은 작업 단위로 DESIGN.md §4.3에 배지 명세를 추가한다(원칙 V).
- **Alternatives considered**:
  - `position: fixed` (뷰포트 기준): 에디터 3열이 화면 우측을 차지하므로 결과
    위치는 유사하나, 빈 상태/마이 페이지에서 숨김 처리를 별도로 해야 함 —
    Editor 내부 absolute면 FR-007이 구조적으로 공짜로 해결되므로 기각.
  - 신규 컴포넌트 파일(`CharCounter.tsx`): span 하나에 파일·prop 인터페이스
    추가는 과잉(원칙 IV) — Editor 인라인으로 기각.

## R4. 접근성 처리

- **Decision**: 일반 텍스트 span으로 렌더하고 `aria-live`는 부여하지 않는다.
- **Rationale**: `aria-live`를 붙이면 키 입력마다 스크린 리더가 숫자를 낭독해
  소음이 된다. 카운터는 시각 보조 정보이며, 값 자체는 DOM 텍스트로 존재해
  탐색 시 읽을 수 있다. 기존 앱의 접근성 수준(DESIGN.md §6)과 일관.
- **Alternatives considered**: `role="status"`/`aria-live="polite"` — 입력마다
  낭독되는 안티패턴이라 기각.

## R5. 표시 형식 (FR-005/FR-006)

- **Decision**: `` `${count}자` `` — 천 단위 구분 없이 숫자 그대로 (예: "0자",
  "128자", "12345자").
- **Rationale**: 스펙 예시("128자", "0자")와 일치하는 가장 단순한 형식.
  천 단위 구분은 스펙이 요구하지 않음(클래리파이에서 저영향으로 분류) — 필요해지면
  `toLocaleString("ko-KR")` 한 줄로 추가 가능.
- **Alternatives considered**: `1,234자`(toLocaleString) — 요구 없음, YAGNI 기각.
  "글자 수: 128" 라벨 형식 — 스펙 예시와 다름, 기각.
