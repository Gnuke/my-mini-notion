# Data Model: 랜덤 고양이 커버 이미지

**Date**: 2026-07-13 | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

영속 데이터는 추가되지 않는다(커버는 저장하지 않는 표시용 값 — clarify Q1).
변경은 (1) 기존 `Post`에서 커버 필드 제거, (2) 런타임 전용 뷰 상태 신설 두 가지다.

## 1. Post (기존 — 필드 제거)

`lib/data.ts`

| 필드 | 타입 | 변경 |
| --- | --- | --- |
| `id` | `string` | 유지 |
| `emoji` | `string` | 유지 |
| ~~`cover`~~ | ~~`CoverKey \| null`~~ | **삭제** (FR-010) |
| `title` | `string` | 유지 |
| `body` | `string` | 유지 |
| `updated` | `number` | 유지 |
| `created` | `number` | 유지 |

함께 삭제되는 선언:

- `export type CoverKey = "blue" | "green" | "amber" | "red" | "gray"` — 삭제
- `export const COVERS: Record<CoverKey, string>` — 삭제
- `makeSeed()` 시드 p1의 `cover: "blue"` 및 p2~p5의 `cover: null` — 삭제
- `lib/store.tsx` 새 글 생성 객체의 `cover: null` — 삭제

**레거시 데이터 처리**: localStorage(`mini-nook-v1`)에 이미 저장된 글의 `cover`
속성은 읽는 코드가 없어지므로 무시된다. 마이그레이션·정리 없음(research R7).

## 2. CatItem (신규 — 외부 API 응답 항목, 런타임 전용)

`lib/catCover.ts` — [contracts/cataas-api.md](./contracts/cataas-api.md)의 실측 구조.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | `string` | 고양이 사진 식별자. 이미지 URL(`https://cataas.com/cat/{id}`) 구성에 사용 |
| `tags` | `string[]` | 태그 목록 (`"cute"` 포함) |
| `mimetype` | `string` | 예: `"image/jpeg"` — 사용하지 않지만 실측 구조 보존 |
| `createdAt` | `string` | ISO 타임스탬프 — 사용하지 않지만 실측 구조 보존 |

검증 규칙: 배열이 아니거나 빈 배열이면 커버 실패로 처리(FR-006, Edge Case).
`id`가 문자열이 아닌 항목은 선택 대상에서 제외한다.

## 3. CatCover 뷰 상태 (신규 — 컴포넌트 내부 상태 머신)

`components/CatCover.tsx` — 저장·공유되지 않는 컴포넌트 로컬 상태.

```text
        postId 변경/마운트
              │  (이전 요청 abort)
              ▼
         ┌─────────┐   목록 fetch 성공 + 랜덤 선택 + img onLoad   ┌───────┐
         │ loading │ ───────────────────────────────────────────▶ │ ready │
         │(스켈레톤)│                                              │(이미지)│
         └─────────┘                                              └───────┘
              │  fetch 실패 · HTTP 오류 · 빈 배열 · img onError
              ▼
         ┌─────────┐
         │  error  │  (아무것도 렌더하지 않음, onVisibilityChange(false))
         └─────────┘
```

| 상태 | 필드 | 화면 |
| --- | --- | --- |
| `loading` | `imageUrl: string \| null` (선택 후 채워짐) | 스켈레톤 밴드 (150px, 맥동) |
| `ready` | `imageUrl: string` | `<img>` 커버 (150px, object-fit: cover) |
| `error` | — | 렌더 없음 (커버 영역 제거) |

전이 규칙:

- `postId`가 바뀌면 무조건 `loading`으로 리셋하고 이전 fetch를 abort한다(FR-003, FR-008).
- abort된 요청의 콜백은 상태를 건드리지 않는다(`AbortError` 무시 — research R5).
- `ready`/`error` 도달 시 `onVisibilityChange(visible)`로 Editor에 통지한다
  (`loading`·`ready` = true, `error` = false — research R8).

## 4. 관계

```text
Editor ──(postId, onVisibilityChange)──▶ CatCover ──fetch──▶ cataas API
  │                                          │
  └─ 이모지 marginTop: 커버 표시 -44px         └─ pickRandomCatUrl(CatItem[])
     / 숨김 12px                                  (lib/catCover.ts 순수 함수)
```

- `Post`와 커버 사이에는 **아무 관계도 없다** — 커버는 글 데이터와 무관한 세션 표시용
  값이며, 같은 글이라도 열 때마다 달라질 수 있다(clarify Q1).
