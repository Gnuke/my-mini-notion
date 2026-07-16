# Contract: 데이터 접근 & 스토어 상태 (page-store)

**Feature**: 002-supabase-page-crud | **Date**: 2026-07-16

앱 내부 모듈 간 계약. 이 계약을 기준으로 테스트를 먼저 작성한다(원칙 I).

## 1. `lib/supabase/client.ts` — 브라우저 클라이언트 (인증 기능과 공유 seam)

```ts
export function getSupabase(): SupabaseClient
```

- `@supabase/ssr`의 `createBrowserClient(NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY)`를 모듈 수준 싱글턴으로 반환한다.
- 병행 중인 인증 기능이 같은 경로에 먼저 파일을 만들었으면 그대로 사용하고
  중복 생성하지 않는다(.env.example의 사용처 목록과 경로 일치).
- 테스트에서의 모킹 경계는 이 모듈 1곳이다(R5).

## 2. `lib/pages.ts` — page 테이블 CRUD

모든 함수는 Supabase 오류(`error !== null`) 시 `Error`를 throw한다(메시지에
supabase 오류 메시지 포함). 호출자는 예외를 잡아 UI 상태로 변환한다.

```ts
export function mapRow(row: PageRow): Post
// { id, title, body: content ?? "", created: Date.parse(created_at) }

export async function fetchPages(): Promise<Post[]>
// from("page").select("*").order("created_at", { ascending: false })
// RLS가 본인 행만 반환 — user_id 필터를 클라이언트에서 추가하지 않는다

export async function createPage(userId: string): Promise<Post>
// from("page").insert({ title: "", content: "", user_id: userId }).select().single()
// 반환 row(DB 생성 id/created_at 포함)를 Post로 매핑해 반환

export async function updatePage(
  id: string,
  fields: { title?: string; body?: string }
): Promise<void>
// body → content 매핑 후 from("page").update(...).eq("id", id)

export async function deletePage(id: string): Promise<void>
// from("page").delete().eq("id", id)
```

## 3. `lib/store.tsx` — `NookStore` 인터페이스 (수정)

```ts
interface NookStore {
  // 목록 로딩
  loading: boolean;          // [신규] 초기 목록 로딩 중 (FR-011)
  loadError: boolean;        // [신규] 목록 조회 실패
  retry: () => void;         // [신규] 조회 재시도 (loading으로 복귀)

  // 데이터
  posts: Post[];             // created 내림차순 유지
  selectedId: string | null; // 메모리 전용 (localStorage 영속 제거)
  active: Post | null;

  // 조작
  select: (id: string) => void;                 // 전환 시 보류 저장 flush
  newPost: () => Promise<string | null>;        // [변경] 서버 insert 후 id 반환, 실패 시 null
  patch: (f: { title?: string; body?: string }) => void; // 로컬 즉시 + 600ms 디바운스 update
  remove: () => Promise<void>;                  // 서버 delete 성공 시에만 목록에서 제거

  // 저장 표시 (FR-012)
  saved: boolean;        // [의미 변경] 서버 update/insert 성공 직후 1.5초 true
  saveFailed: "update" | "delete" | null; // [신규] 직전 실패 연산 (다음 성공 시 해제)
                         // — UI가 "저장 실패"/"삭제 실패"를 구분해야 해 연산 종류를 담는다
  createFailed: boolean; // [신규] 직전 newPost 실패 (다음 성공/재시도 시 해제)

  // 프로필 (범위 밖 — 기존 유지)
  profile: Profile;
  setNickname: (n: string) => void;
  setAvatar: (a: string | null) => void;
  flash: () => void; // 프로필 저장 확인 플래시(마이 페이지) — 기존 동작 유지용
}
```

### 동작 규칙

1. **초기화**: 마운트 시 `supabase.auth.getUser()` → 사용자 없으면 기존
   가드 흐름대로 로그인 화면 안내(데이터 요청 없음). 사용자 있으면
   `fetchPages()` → 성공 시 첫 글 자동 선택(없으면 `null` = 빈 상태),
   실패 시 `loadError`.
2. **글 데이터의 localStorage 영속 금지**(FR-006): `posts`/`selectedId`는
   저장하지 않는다. `profile`만 기존 키에 유지(범위 밖).
3. **patch**: 로컬 상태 즉시 갱신(입력 반응성) → 600ms 디바운스 후
   `updatePage()` 1회. 연속 입력은 타이머 리셋. `select()`·언마운트 시 보류
   변경 즉시 flush. `saved`는 서버 성공 응답 후에만 true(1.5초 뒤 자동
   해제, 연속 성공 시 타이머 리셋).
4. **실패 시**: 로컬 내용을 버리지 않는다(FR-007). `saveFailed`/
   `createFailed`를 켜고, 대응 문구는 [page-ui.md](./page-ui.md) 참조.
5. **시드·마이그레이션 없음**: 기존 localStorage의 글 데이터는 읽지 않는다
   (스펙 Assumptions). 빈 계정은 빈 상태로 시작.

## 4. 테스트 계약 (모킹 경계)

- `vi.mock("@/lib/supabase/client")` — `getSupabase()`가 반환하는 모의
  클라이언트는 실제 supabase-js 체이닝(`from → select/insert/update/delete →
  eq/order/select/single`)과 응답 구조 `{ data, error }` 전체를 재현한다
  (부분 모킹 금지 — 헌법 I).
- `auth.getUser()`는 `{ data: { user: { id: <uuid> } }, error: null }` 형태
  전체를 재현한다.
- 스토어·컴포넌트·`lib/pages.ts` 매핑은 실제 구현을 사용한다.
