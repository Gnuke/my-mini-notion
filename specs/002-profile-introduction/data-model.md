# Data Model: 마이페이지 자기소개 (002-profile-introduction)

**Date**: 2026-07-16 | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

## 엔티티

### 프로필 (기존 — `public.profile`, 구조 변경 금지)

사용자가 직접 만들어 둔 Supabase 테이블. 이 기능은 `introduction` 값의
읽기/쓰기만 수행하며 스키마·정책·다른 컬럼은 일절 건드리지 않는다.

| 컬럼 | 타입 | 이 기능에서의 역할 |
| --- | --- | --- |
| `id` | uuid PK | 갱신 대상 행 식별 (조회 시 함께 읽음) |
| `created_at` | timestamptz | 대상 행 선정 정렬 기준 (`order by created_at asc limit 1`) |
| `name` | text | 사용 안 함 (별명은 기존 localStorage 유지 — FR-009) |
| `user_id` | uuid FK→auth.users | 사용 안 함 (모의 인증이라 매칭 근거 없음) |
| `avatar_url` | text null | 사용 안 함 |
| `updated_at` | timestamptz | 사용 안 함 (관리 요구 없음 — YAGNI) |
| **`introduction`** | **text null** | **자기소개 본문. 이 기능의 유일한 읽기/쓰기 대상** |

- RLS: enabled, 정책 3건 모두 `authenticated` 전용 → 접근은 서버 라우트의
  서비스 롤 키로만 수행 (research.md R1)
- 행 수: 1건 전제 (0건이면 조회 오류로 처리, 2건 이상이면 첫 행 규칙 — R2)

### 자기소개 값 (클라이언트 관점)

| 속성 | 규칙 |
| --- | --- |
| 타입 | 여러 줄 문자열 (줄바꿈 `\n` 보존) 또는 미등록 |
| 미등록 표현 | DB `NULL` (빈 문자열도 조회 시 미등록으로 취급) — R3 |
| 등록 값 | 입력한 그대로 저장 (내용 trim 없음, 이모지 보존) |
| 정규화 | 저장 직전 `normalizeIntroduction`: `trim() === ""` → `NULL` |
| 길이 한도 | `countChars(값) ≤ 500` (grapheme 단위, 공백·줄바꿈 포함) — 저장·수정 시에만 적용 |
| 레거시 초과 값 | 조회 시 전체 그대로 표시, 잘라내기 금지. 짧아지는 편집만 허용 — R4 |

## 클라이언트 상태 (마이페이지 로컬 — 스토어 미확장)

```text
introStatus: "loading" | "ready" | "load-error"
introduction: string          // textarea 현재 값 (ready일 때만 의미)
saveError: string | null      // 저장 실패 안내 문구 (성공·재시도 시 초기화)
```

### 상태 전이

```text
[마운트] → loading
loading  --GET 성공(값 or NULL)--> ready (introduction = 값 ?? "")
loading  --GET 실패-------------> load-error (textarea 비활성 + 오류 안내)
ready    --입력(가드 통과)-------> ready (introduction 갱신)
ready    --저장 성공------------> ready (flash "저장되었습니다 ✓", saveError=null)
ready    --저장 실패------------> ready (saveError 표시, 입력값 유지)
load-error --새로고침(재마운트)--> loading
```

- 화면 게이트: `store.loaded && introStatus !== "loading"`이 될 때까지 기존
  로딩 화면 유지 (Clarifications: "불러온 뒤 표시") → 뒤늦은 응답이 입력을
  덮어쓰는 경로가 존재하지 않음
- `load-error`에서는 저장 불가(비활성) — 모르는 저장본 덮어쓰기 방지 (FR-010 근거)

## 검증 규칙 (요구사항 매핑)

| 규칙 | 근거 |
| --- | --- |
| 여러 줄 입력 허용, 줄바꿈 보존 | FR-001, Edge |
| 저장은 기존 "변경 사항 저장" 버튼으로만 | FR-002, Clarifications |
| 저장 성공 시에만 확인 표시, 실패 시 안내 + 입력 보존 | FR-006, FR-007 |
| `trim` 결과 빈 값 → NULL 저장(미등록 복귀) | FR-005 |
| `countChars > 500` 신규 입력 차단(짧아지는 변경은 허용), 초과 상태 저장 거부 + 안내 | FR-008 |
| 조회 실패 상태는 미등록 placeholder와 시각·의미적으로 구분 | FR-004, FR-010 |
| introduction 외 컬럼·스키마·정책 불변 | FR-002 (사용자 제약) |
