# Data Model: 본문 글자 수 카운터

**Feature**: 001-char-counter | **Date**: 2026-07-10

## 엔티티

### 글(포스트) — 기존, 변경 없음

`lib/data.ts`의 `Post` 타입을 그대로 사용한다. 이 기능은 필드를 추가·변경하지
않는다.

| 필드 | 타입 | 이 기능과의 관계 |
| --- | --- | --- |
| `id` | `string` | 글 전환 감지(선택된 글 변경 시 카운터 대상 교체) |
| `body` | `string` | **글자 수 계산의 유일한 입력** (FR-001) |
| `title` | `string` | 계산에서 제외 (FR-001) |
| `emoji`, `cover`, `updated`, `created` | — | 무관 |

### 글자 수 — 파생 값 (저장하지 않음)

| 항목 | 내용 |
| --- | --- |
| 정의 | `countChars(post.body)` — 사용자 인지 글자(grapheme) 단위 개수 |
| 계산 규칙 | 공백·줄바꿈 각 1자, 조합 이모지·국기 각 1자 (FR-004, [research R1](./research.md)) |
| 저장 | 하지 않음 — 렌더 시 `body`에서 파생 (`useMemo`, [research R2](./research.md)) |
| 소비처 | Editor 우측 하단 배지 1곳 (다른 화면 재사용 없음 — 스펙 Assumptions) |

## 검증 규칙

- `countChars("")` = 0 → 배지 "0자" (FR-006)
- `countChars`는 순수 함수 — 동일 입력에 항상 동일 출력, 부수효과 없음
- 입력 상한 없음 (본문 길이 제한은 이 기능 범위 밖)

## 상태 전이

이 기능 자체의 저장 상태는 없다. 표시 상태는 기존 스토어 상태에서 파생된다:

```
active == null (글 미선택)  → 배지 렌더 안 함 (Editor 자체가 렌더되지 않음, FR-007)
active != null              → 배지 = countChars(active.body) + "자"
  ├─ body 변경 (patch)      → 같은 렌더 사이클에 재계산·갱신 (FR-002)
  └─ selectedId 변경        → 새 active.body 기준으로 재계산 (FR-008)
```
