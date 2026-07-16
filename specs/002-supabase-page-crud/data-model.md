# Data Model: 페이지 게시글 서버 저장 및 사용자별 접근 제어

**Date**: 2026-07-16 | **Plan**: [plan.md](./plan.md)

## 1. DB 테이블 — `public.page` (기존, 구조 변경 금지)

사용자가 미리 만들어 둔 테이블. 컬럼·제약을 변경하지 않는다(FR-005).
2026-07-16 MCP 조회로 확인한 실제 구조:

| 컬럼 | 타입 | 제약/기본값 | 이 기능에서의 사용 |
| --- | --- | --- | --- |
| `id` | `uuid` | PK, default `gen_random_uuid()` | 글 식별자 — 삽입 시 미지정(DB 생성) |
| `created_at` | `timestamptz` | default `now()` | 생성 시각 — 삽입 시 미지정(DB 생성). 정렬·시간 표시 기준 |
| `title` | `text` | NOT NULL, default `'제목없음'` | 제목 — 삽입 시 빈 문자열 `""` 명시(기본값 비의존, R7) |
| `content` | `text` | nullable | 본문 — 삽입 시 빈 문자열 `""` 명시. 조회 시 `null → ""` 정규화 |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users.id` | 작성자 — 삽입 시 세션 사용자 id 명시(default 없음, R6) |

- RLS: enabled. 정책 4개를 이 기능에서 추가한다(§4, 사용자 승인 — R3).
- `profile` 테이블은 이 기능 범위 밖(프로필은 localStorage 유지).

## 2. 클라이언트 모델 — `Post` (lib/data.ts, 수정)

```ts
export interface Post {
  id: string;      // page.id (uuid)
  title: string;   // page.title
  body: string;    // page.content (null → "")
  created: number; // page.created_at → epoch ms (rel() 표시·정렬용)
}
```

**제거되는 필드/심볼** (FR-009 — 저장 컬럼 없음, UI에서 제거):

- `Post.emoji`, `Post.cover`, `Post.updated`
- `CoverKey`, `EMOJIS`, `COVERS`, `makeSeed()`(시드 미생성), `uid()`(id는 DB 생성)
- `LS_KEY`의 글/선택 상태 영속 용도 (프로필 영속 용도만 남음 — 범위 밖 유지)

**유지**: `Profile`, `DEFAULT_PROFILE`, `rel()`, `AUTH_KEY`(모의 가드 —
인증 기능이 교체 예정).

## 3. 매핑 규칙 (lib/pages.ts)

| 방향 | 규칙 |
| --- | --- |
| row → Post | `{ id, title, body: content ?? "", created: Date.parse(created_at) }` |
| 생성(insert) | `{ title: "", content: "", user_id: <세션 사용자 id> }` → 반환 row를 Post로 매핑 |
| 수정(update) | `title`/`body` 중 변경분만 `{ title?, content? }`로 전송, `id` 일치 행 대상 |
| 삭제(delete) | `id` 일치 행 삭제 |
| 목록(select) | 전 컬럼 조회, `created_at` 내림차순(최신 생성 순) — RLS가 본인 행만 반환 |

검증 규칙:

- 제목·본문 빈 값 허용(빈 제목 표시 규칙은 [contracts/page-ui.md](./contracts/page-ui.md)).
- 소유자 검증은 클라이언트에서 하지 않는다 — DB의 RLS가 유일한 강제
  지점이며, 클라이언트 조회에 `user_id` 필터를 추가하지 않아도 본인 글만
  반환된다(단순성을 위해 명시 필터도 넣지 않는다).

## 4. RLS 정책 (신규 — supabase/migrations/20260716_page_rls_policies.sql)

전문은 [research.md R3](./research.md) 참조. 요약:

| 정책 | 대상 | 조건 |
| --- | --- | --- |
| `page_select_own` | `authenticated` SELECT | `auth.uid() = user_id` (USING) |
| `page_insert_own` | `authenticated` INSERT | `auth.uid() = user_id` (WITH CHECK) |
| `page_update_own` | `authenticated` UPDATE | USING + WITH CHECK 모두 `auth.uid() = user_id` |
| `page_delete_own` | `authenticated` DELETE | `auth.uid() = user_id` (USING) |

- `anon` 역할에는 정책이 없음 → 비로그인 접근 전면 거부(FR-001, US3).
- 타인 글은 SELECT부터 거부되므로 존재 여부도 노출되지 않음(Edge Case).

## 5. 상태 전이

### 목록 로딩 (스토어 초기화)

```
init ──(세션 확인: 없음)──▶ 로그인 화면으로 안내 (요청 없음)
init ──(세션 있음)──▶ loading ──(select 성공)──▶ ready (posts, 첫 글 자동 선택)
                       └──(select 실패)──▶ loadError ──(다시 시도)──▶ loading
```

### 편집 저장 (제목/본문 patch)

```
idle ──(입력: 로컬 즉시 반영)──▶ pending(600ms 디바운스, 연속 입력 시 리셋)
pending ──(타이머 만료/글 전환/언마운트 flush)──▶ saving(update 전송)
saving ──(성공)──▶ saved 표시("저장됨 ✓" 1.5초) ──▶ idle
saving ──(실패)──▶ saveFailed 표시("저장 실패", 로컬 내용 유지) ──(다음 저장 성공)──▶ idle
```

### 생성/삭제

```
newPost ──(insert 성공)──▶ posts 맨 앞 추가 + 선택 + 에디터 열림
        └──(insert 실패)──▶ 글 미생성 + 오류 안내(목록 오류 줄)
remove(확인 팝오버 확정) ──(delete 성공)──▶ 목록에서 제거, 남은 첫 글 선택(없으면 빈 상태)
        └──(delete 실패)──▶ 글 유지 + 오류 안내("삭제 실패")
```

동시 편집: 마지막 저장 우선(last-write-wins) — DB가 최종 update를 그대로
반영하며 별도 버전 관리 없음(스펙 Assumptions).
