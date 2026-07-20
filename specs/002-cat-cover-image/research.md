# Research: 랜덤 고양이 커버 이미지

**Date**: 2026-07-13 | **Plan**: [plan.md](./plan.md)

Technical Context의 미확정 항목을 조사·실측해 확정한다. NEEDS CLARIFICATION 잔여 0건.

## R1. cataas API 응답 구조 (실측)

- **Decision**: `GET https://cataas.com/api/cats?tags=cute` 응답을 아래 실측 구조로
  확정하고, 테스트 모의 응답도 이 구조 전체를 사용한다.

  ```json
  [
    {
      "id": "0F0IKAPOdWiE755P",
      "tags": ["meet", "cute"],
      "mimetype": "image/jpeg",
      "createdAt": "2024-06-18T09:46:45.702Z"
    }
  ]
  ```

  - HTTP 200, `Content-Type: application/json`
  - 파라미터 없이 호출 시 **기본 10건** 반환
  - 개별 이미지는 `GET https://cataas.com/cat/{id}` (200, `image/jpeg` 등 바이너리,
    실측 약 107KB). HEAD 메서드는 404를 반환하므로 검증·프리로드는 GET/`<img>`로 한다.
- **Rationale**: 2026-07-13 PowerShell `Invoke-WebRequest` 실측. 헌법 I의 모킹 규칙
  ("모의 응답은 실제 API 구조 전체를 반영")을 지키려면 추측이 아닌 실측 구조가 필요하다.
- **Alternatives considered**: 문서만 참조 — cataas 문서는 버전에 따라 `_id`/`id`
  표기가 갈려 실측으로 확정했다.

## R2. CORS — 브라우저에서 직접 호출 가능 여부

- **Decision**: 클라이언트 컴포넌트에서 브라우저 `fetch`로 직접 호출한다. 프록시
  (Next.js API Route)를 만들지 않는다.
- **Rationale**: 실측 응답 헤더에 `Access-Control-Allow-Origin: *`가 포함되어 브라우저
  교차 출처 호출이 허용된다. 프록시는 YAGNI(원칙 IV) 위반.
- **Alternatives considered**: `/api/cat-cover` 프록시 라우트 — CORS가 막혔다면
  필요했겠지만 실측 결과 불필요. 서버 컴포넌트 fetch — 글 전환마다 클라이언트에서
  재요청해야 하는 요구(FR-003)와 맞지 않음.

## R3. 랜덤 선택 전략

- **Decision**: 사용자가 지정한 엔드포인트를 **그대로** 호출하고, 반환된 목록(기본
  10건)에서 `Math.random()`으로 1건을 고른 뒤 `https://cataas.com/cat/{id}` URL을
  만든다. 빈 배열이면 실패로 처리한다(스펙 Edge Case).
- **Rationale**: 스펙 Assumptions에 엔드포인트가 사용자 지정 값으로 기록되어 있어
  임의 파라미터 추가를 피한다. 10건 중 랜덤이면 글 전환 시 체감 변화가 충분하다.
- **Alternatives considered**:
  - `&skip=<난수>` 추가로 표본 확대 — 총 건수 조회가 선행돼야 하고 사용자 지정
    엔드포인트를 변형함. 기각.
  - `https://cataas.com/cat/cute` (JSON 단계 없이 바로 랜덤 이미지) — 더 단순하지만
    사용자가 명시한 엔드포인트가 아니므로 기각.

## R4. 스켈레톤 UI 설계 (DESIGN.md 신규 요소)

- **Decision**: 커버 밴드와 동일한 자리(전체 폭 × 150px)에 배경
  `var(--surface-hover)`(#efefed) 블록을 놓고, `nk-skeleton-pulse` keyframes
  (opacity 1 → 0.55, 1.2s ease-in-out infinite alternate)로 은은하게 맥동시킨다.
  keyframes는 인라인 스타일로 불가능하므로 `app/globals.css`에 추가한다.
  스켈레톤 요소에는 `role="status"` + `aria-label="커버 이미지 불러오는 중"`을 부여한다.
- **Rationale**: DESIGN.md에 스켈레톤 명세가 없어(신규 요소) 기존 토큰만으로 구성했다.
  Notion풍 절제된 모션이라는 디자인 언어에 맞춰 이동·크기 변화 없이 투명도만 바꾼다.
  기존 전역 규칙 `@media (prefers-reduced-motion: reduce)`가 animation-duration을
  0.001ms로 줄여 접근성도 자동 충족된다. 스피너 금지(FR-004)와 크기 고정(FR-005)을
  구조적으로 보장한다.
- **Alternatives considered**: 정적 회색 블록(맥동 없음) — "로딩 중"이라는 상태 전달이
  약해 스켈레톤 UI라는 요구 취지에 미달. shimmer 그라데이션 슬라이드 — 신규 색상
  정의가 필요하고 절제된 모션 원칙과 어긋나 기각.

## R5. 레이스 컨디션 처리 (FR-008)

- **Decision**: `useEffect(…, [postId])`에서 `AbortController`를 생성해 fetch에
  전달하고, cleanup에서 `abort()`한다. 상태 갱신 전 `signal.aborted`를 확인한다.
  `AbortError`는 오류 상태로 취급하지 않는다(다음 요청이 이미 시작됨).
- **Rationale**: 글 전환 시 이전 응답이 새 글의 커버를 덮어쓰는 문제를 브라우저 표준
  API만으로 해결한다. 추가 라이브러리·전역 상태 불필요.
- **Alternatives considered**: "최신 요청 id" 클로저 플래그 — 동작은 같지만 네트워크
  요청 자체는 계속 진행되므로 AbortController가 더 정확. SWR/React Query 도입 —
  의존성 추가로 YAGNI 위반.

## R6. 이미지 로드 완료 시점까지 스켈레톤 유지

- **Decision**: 상태 머신을 `loading → ready | error` 3상태로 두고, JSON 응답 후에도
  `<img>`의 `onLoad`가 발화할 때까지 `loading`을 유지한다. img는 밴드 안에 항상
  렌더하되(스켈레톤이 위를 덮음) `onLoad` 시 ready, `onError` 시 error로 전이한다.
  error 시 컴포넌트는 아무것도 렌더하지 않고 `onVisibilityChange(false)`를 통지한다.
- **Rationale**: 사용자가 인지하는 "로딩"은 메타데이터가 아니라 사진이 보이는
  순간까지다(스펙 US2). 깨진 이미지 노출도 구조적으로 차단한다(Edge Case).
- **Alternatives considered**: JSON 도착 시점에 바로 img 노출 — 사진 다운로드 동안
  빈 영역/깨진 아이콘이 보일 수 있어 기각. `new Image()` 프리로드 — jsdom 테스트에서
  관찰이 어렵고 DOM `<img>` 이벤트로 충분해 기각.

## R7. 기존 커버 데이터·코드 제거 범위 (FR-010)

- **Decision**: 다음을 모두 삭제한다 —
  `lib/data.ts`의 `CoverKey` 타입·`COVERS` 상수·`Post.cover` 필드·시드 p1의
  `cover: "blue"`, `lib/store.tsx`의 새 글 `cover: null`, `components/Editor.tsx`의
  커버 밴드·커버 피커 팝오버·`coverOpen` 상태·`커버 추가` 버튼·`coverBtnStyle`.
  기존 localStorage에 남은 `cover` 속성은 읽지 않으므로 마이그레이션 없이 무해하게
  방치된다(구조적 타이핑상 여분 속성은 무시됨).
- **Rationale**: 죽은 코드를 남기지 않는 원칙 IV. 데이터 마이그레이션은 읽지 않는
  필드에 대해 불필요한 복잡성.
- **Alternatives considered**: `cover` 필드를 deprecated로 유지 — 사용처가 없는
  필드 유지는 YAGNI 위반. localStorage 정리 마이그레이션 — 무해한 잔존 데이터에
  대한 과잉 처리.

## R8. 이모지-커버 겹침 유지 방법

- **Decision**: `CatCover`에 `onVisibilityChange?: (visible: boolean) => void` 콜백을
  두고, Editor가 이를 받아 이모지 `marginTop`을 커버 표시 시 `-44px`(기존 겹침 값),
  숨김 시 `12px`로 전환한다. 초기값은 표시(true) — 스켈레톤도 커버 영역이므로.
- **Rationale**: DESIGN.md §4.3의 기존 겹침 디자인(-44px)을 보존하면서, 실패로 커버가
  사라진 경우 이모지가 탑바 쪽으로 튀어나가는 것을 막는다.
- **Alternatives considered**: 겹침 폐지(항상 12px) — 기존 디자인 언어 변경이므로
  기각. Editor가 fetch 상태를 직접 소유 — 커버 로직이 Editor에 새어 나와 컴포넌트
  경계가 흐려짐. 콜백 1개가 최소 결합.
