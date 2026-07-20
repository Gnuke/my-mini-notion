# UI Contract: CatCover 컴포넌트 & 헬퍼

**Date**: 2026-07-13 | 관련: [data-model.md](../data-model.md), [cataas-api.md](./cataas-api.md)

## 1. `lib/catCover.ts` (순수 헬퍼)

```ts
export const CAT_API_URL = "https://cataas.com/api/cats?tags=cute";

export interface CatItem {
  id: string;
  tags: string[];
  mimetype: string;
  createdAt: string;
}

/** 목록에서 무작위 1건을 골라 이미지 URL을 만든다. 유효 항목이 없으면 null. */
export function pickRandomCatUrl(items: unknown): string | null;
```

계약:

- 입력이 배열이 아니면 `null`
- 배열 중 `id`가 비어 있지 않은 문자열인 항목만 후보로 삼고, 후보가 없으면 `null`
- 반환 URL 형식: `https://cataas.com/cat/{id}`
- 부수효과 없음 (fetch·상태 변경 금지 — 무작위 선택만 예외적 비결정성)

## 2. `components/CatCover.tsx` (클라이언트 컴포넌트)

### Props

| prop | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `postId` | `string` | ✔ | 대상 글 id. 값이 바뀌면 이전 요청을 abort하고 새로 불러온다 (FR-003, FR-008) |
| `onVisibilityChange` | `(visible: boolean) => void` | — | 커버 영역 표시 여부 통지. `loading`/`ready` = true, `error` = false (research R8) |

### 상태별 DOM 계약

**loading (스켈레톤)** — FR-004, FR-005:

```html
<div style="position: relative; height: 150px">        <!-- 커버 밴드: 전체 폭 × 150px -->
  <div role="status" aria-label="커버 이미지 불러오는 중"
       style="position: absolute; inset: 0; background: var(--surface-hover);
              animation: nk-skeleton-pulse 1.2s ease-in-out infinite alternate" />
  <img src="…" alt="랜덤 고양이 커버" …(로드 전, 스켈레톤 아래) />  <!-- URL 확보 후 -->
</div>
```

- 로딩 스피너(회전 요소) 사용 금지 (SC-002)
- 스켈레톤은 밴드 전체(inset: 0)를 덮어 크기가 커버와 동일 (FR-005)

**ready (이미지)**:

```html
<div style="position: relative; height: 150px">
  <img src="https://cataas.com/cat/{id}" alt="랜덤 고양이 커버"
       style="width: 100%; height: 150px; object-fit: cover; display: block" />
</div>
```

- 밴드 높이가 150px로 동일하므로 스켈레톤→이미지 교체 시 제목 위치 불변 (SC-003)

**error**: 아무것도 렌더하지 않는다(`null`). 깨진 이미지·스켈레톤 잔존 금지 (FR-006).

### 동작 계약

1. 마운트·`postId` 변경 시: `loading` 리셋 → `fetch(CAT_API_URL, { signal })` →
   `pickRandomCatUrl` → `<img>` 로드 대기
2. `<img>` `onLoad` → `ready`, `onError` → `error`
3. cleanup에서 `AbortController.abort()`; `AbortError`는 상태를 바꾸지 않는다
4. 상태 확정 시 `onVisibilityChange` 호출 (error에서만 false)
5. 한국어 문자열 (FR-009): `alt="랜덤 고양이 커버"`, `aria-label="커버 이미지 불러오는 중"`

## 3. Editor 통합 계약

- 렌더 위치: 스크롤 영역 최상단, 본문 컬럼(`max-width: 720px`) **바깥** — 기존 커버
  밴드와 같은 전체 폭 자리 (DESIGN.md §3.3)
- `<CatCover postId={active.id} onVisibilityChange={setCoverVisible} />`
- 이모지 `marginTop`: `coverVisible ? -44 : 12` (px, DESIGN.md §4.3 기존 겹침 값 유지)
- `coverVisible` 초기값 `true`, 글 전환 시 `true`로 리셋
- 제거 확인: `커버 추가`·`커버 변경`·`삭제`(커버) 버튼, 커버 색상 피커, `COVERS` import가
  Editor에 존재하지 않아야 한다 (FR-010)

## 4. 테스트 관측 지점 (RTL 쿼리 기준)

| 검증 대상 | 쿼리 |
| --- | --- |
| 스켈레톤 표시 | `getByRole("status", { name: "커버 이미지 불러오는 중" })` |
| 이미지 표시 | `getByRole("img", { name: "랜덤 고양이 커버" })` + `src` 검증 |
| 실패 시 숨김 | `queryByRole("status")`·`queryByRole("img", …)` 모두 `null` |
| 스피너 부재 | 로딩 중 progressbar/spinner 역할 요소 부재 |
| 기존 기능 제거 | `queryByText("커버 추가")` 등 커버 버튼 부재 (Editor 테스트) |
