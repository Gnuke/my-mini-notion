# Contract: 자기소개 API (`/api/profile/introduction`)

**Feature**: 002-profile-introduction | **Type**: Next.js Route Handler (서버 전용)

서비스 롤 키로 `public.profile` 첫 행(`order by created_at asc limit 1`)의
`introduction`만 읽고 쓴다. 다른 컬럼·행·테이블 접근 금지.

## 공통

- 런타임: Node (App Router Route Handler, `app/api/profile/introduction/route.ts`)
- 환경 변수: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (서버 전용)
- 응답 본문은 항상 JSON. 서비스 롤 키·내부 에러 상세는 응답에 노출하지 않는다.
- **캐시 금지**: 라우트는 `export const dynamic = "force-dynamic"`, DB로 나가는
  모든 fetch는 `cache: "no-store"`로 호출한다. Next.js 데이터 캐시가 조회 응답을
  재사용하면 저장 직후에도 stale 값이 반환되기 때문(실측 버그, E2E에서 발견).

## GET — 자기소개 조회

| 상황 | 상태 | 응답 본문 |
| --- | --- | --- |
| 성공 (등록됨) | 200 | `{ "introduction": "안녕하세요…" }` |
| 성공 (미등록: NULL 또는 "") | 200 | `{ "introduction": null }` |
| profile 행 0건 | 500 | `{ "error": "PROFILE_NOT_FOUND" }` |
| DB/네트워크/env 누락 오류 | 500 | `{ "error": "LOAD_FAILED" }` |

## PUT — 자기소개 저장

요청: `Content-Type: application/json`, 본문 `{ "introduction": string | null }`

서버 동작: `introduction`이 문자열이고 `trim() === ""`이면 `null`로 정규화
(normalizeIntroduction — 클라이언트와 동일 규칙을 서버에서도 보장).

| 상황 | 상태 | 응답 본문 |
| --- | --- | --- |
| 성공 | 200 | `{ "introduction": <저장된 값: string \| null> }` |
| 본문 파싱 불가 / `introduction` 키 없음 / 타입 오류 | 400 | `{ "error": "INVALID_BODY" }` |
| `countChars(introduction) > 500` | 400 | `{ "error": "TOO_LONG" }` |
| profile 행 0건 | 500 | `{ "error": "PROFILE_NOT_FOUND" }` |
| DB/네트워크/env 누락 오류 | 500 | `{ "error": "SAVE_FAILED" }` |

- 멱등: 같은 본문으로 반복 호출해도 결과 동일.
- 갱신 컬럼은 `introduction` 하나뿐 (`updated_at` 등 다른 컬럼 미변경).

## 계약 테스트 (route.test.ts — supabase-js의 fetch를 스텁)

1. GET: 값 있음 → 200 + 값 / NULL → 200 + null / 행 0건 → 500 PROFILE_NOT_FOUND / PostgREST 오류 → 500 LOAD_FAILED
2. PUT: 정상 저장 → 200 / 공백만 → null로 정규화되어 저장 / 501자(grapheme) → 400 TOO_LONG /
   깨진 본문·타입 오류 → 400 INVALID_BODY / PostgREST 오류 → 500 SAVE_FAILED
3. 500자 경계: 정확히 500자(조합 이모지 포함) → 200
