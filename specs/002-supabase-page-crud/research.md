# Research: 페이지 게시글 서버 저장 및 사용자별 접근 제어

**Date**: 2026-07-16 | **Plan**: [plan.md](./plan.md)

Technical Context의 미지수와 기술 선택을 조사·확정한 기록. 조사 시점에 실제
Supabase 프로젝트 상태를 MCP로 직접 확인했다(테이블 구조, RLS 정책 유무).

## R1. 데이터 접근 방식 — 클라이언트 컴포넌트에서 Supabase 직접 호출

- **Decision**: 기존 `NookProvider`(클라이언트 컨텍스트) 구조를 유지하고,
  클라이언트 컴포넌트에서 `supabase-js`로 `page` 테이블을 직접 CRUD한다.
  서버 라우트·서버 액션은 만들지 않는다.
- **Rationale**: 앱 전체가 이미 클라이언트 컴포넌트 + 단일 컨텍스트 스토어
  구조다. RLS가 DB 수준에서 접근 제어를 강제하므로(R3) 클라이언트 직접 호출로
  FR-001~004의 보안 요구를 충족할 수 있고, 서버 계층 추가는 현재 요구사항에
  불필요한 복잡성이다(헌법 IV — YAGNI). Supabase 공식 권장 패턴이기도 하다
  (anon key + RLS).
- **Alternatives considered**:
  - *Next.js 서버 액션/Route Handler 경유*: 서버 코드·요청 검증·에러 매핑
    계층이 추가되고 기존 스토어 구조를 전면 개편해야 함. RLS가 있는 한 보안
    이득이 없어 기각.
  - *SSR 프리페치(서버 컴포넌트에서 초기 목록 로드)*: 초기 로딩은 빨라지지만
    App Router 데이터 흐름 재설계가 필요. SC-005(3초)는 클라이언트 1회
    select로 충분히 달성 가능해 기각.

## R2. 클라이언트 라이브러리 — `@supabase/supabase-js` + `@supabase/ssr`

- **Decision**: `@supabase/ssr`의 `createBrowserClient(url, anonKey)`로 만든
  브라우저 클라이언트를 `lib/supabase/client.ts`에 두고 앱 전역에서 재사용한다.
- **Rationale**: 병행 중인 인증 기능이 Next.js 미들웨어 기반 세션
  관리(`middleware.ts`, `lib/supabase/server.ts`)를 쓸 예정임이
  `.env.example`에 이미 기록되어 있다. `createBrowserClient`는 세션을 쿠키에
  저장해 미들웨어·서버 클라이언트와 세션을 공유하므로 인증 기능과 자연스럽게
  합류한다. 파일 경로(`lib/supabase/client.ts`)도 `.env.example`의 사용처
  목록과 일치시켰다.
- **Alternatives considered**:
  - *`createClient`(supabase-js 기본, localStorage 세션)*: 세션이
    localStorage에 저장되어 인증 기능의 미들웨어 가드가 세션을 볼 수 없게 됨
    (쿠키 미공유). 합류 시 재작업이 확실해 기각.
  - *구버전 `@supabase/auth-helpers-nextjs`*: deprecated — `@supabase/ssr`로
    대체됨. 기각.

## R3. RLS 정책 — 이 기능에서 4개 추가 (사용자 확인 완료)

- **Decision**: `public.page`에 아래 정책 4개를 마이그레이션으로 추가한다.
  테이블 구조(컬럼·제약)는 변경하지 않는다.

  ```sql
  create policy "page_select_own" on public.page
    for select to authenticated using (auth.uid() = user_id);
  create policy "page_insert_own" on public.page
    for insert to authenticated with check (auth.uid() = user_id);
  create policy "page_update_own" on public.page
    for update to authenticated
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
  create policy "page_delete_own" on public.page
    for delete to authenticated using (auth.uid() = user_id);
  ```

- **Rationale**: 조사 결과 `page` 테이블은 `rls_enabled: true`이지만 **정책이
  0개**였다(`pg_policy` 조회, 2026-07-16). 이 상태로는 모든 접근이 거부되어
  기능이 동작할 수 없다. 스펙 가정("접근 규칙은 사용자가 준비")과 실제가
  달라 사용자에게 보고했고, **"이 기능에서 추가" 승인을 받았다**. 정책은
  `to authenticated`로 한정해 비로그인(anon) 접근을 원천 차단하고(FR-001,
  US3), `auth.uid() = user_id` 조건으로 본인 글만 CRUD 가능하게 한다
  (FR-003/004, US2). UPDATE의 `with check`는 소유권 이전(타인에게 글을
  넘기는 갱신)도 차단한다.
- **Alternatives considered**:
  - *사용자가 대시보드에서 직접 생성*: 구현 전 수동 선행 작업이 필요하고
    저장소에 기록이 남지 않음. 사용자가 기각.
  - *뷰/보안 정의 함수 경유*: 정책 4개로 충분한 요구에 과한 구조. 기각.

## R4. 자동 저장 전략 — 로컬 즉시 반영 + 600ms 디바운스 서버 저장

- **Decision**: 제목·본문 변경은 로컬 상태에 즉시 반영(입력 반응성 유지)하고,
  서버 `update`는 마지막 입력 후 600ms 디바운스로 1회 수행한다. "저장됨 ✓"
  표시는 서버 응답이 성공으로 돌아온 뒤에만 켠다(FR-012). 글 전환·언마운트
  시 보류 중인 변경을 즉시 flush한다.
- **Rationale**: 키 입력마다 네트워크 왕복을 보내면 낭비가 크고 순서 역전
  위험이 있다. 600ms는 "입력을 멈추면 곧 저장된다"는 기존 자동 저장 체감을
  유지하면서 요청 수를 대폭 줄이는 통상값이다. 디바운스 타이머 1개로 구현
  가능해 YAGNI에 부합한다.
- **Alternatives considered**:
  - *키 입력마다 즉시 저장*: 요청 폭주·응답 순서 역전 위험. 기각.
  - *blur/글 전환 시에만 저장*: 저장 간격이 길어져 브라우저 강제 종료 시 유실
    폭이 큼(SC-001 위협). 기각.
  - *오프라인 큐·재시도 백오프*: 현재 요구사항(실패 시 한국어 안내 + 내용
    유지) 이상의 복잡성. 기각(FR-007은 수동 재입력/재시도로 충족).

## R5. 테스트 전략 — Supabase 클라이언트 모듈 경계만 모킹

- **Decision**: `vi.mock("@/lib/supabase/client")`로 클라이언트 팩토리 1곳만
  모킹하고, 모의 응답은 supabase-js 실제 반환 구조(`{ data, error }`,
  체이닝 빌더)를 전체 형태로 재현한다. 스토어·컴포넌트·매핑 로직은 실제
  코드를 사용한다.
- **Rationale**: 헌법 I의 모킹 규칙 — "실제로 느리거나 외부적인 하위 연산만
  모킹"의 정확한 지점이 네트워크 경계인 Supabase 클라이언트다. 부분 모킹
  금지 규칙에 따라 사용하는 체이닝 메서드(`from().select().eq().order()`,
  `insert().select().single()`, `update().eq()`, `delete().eq()`)와 응답
  전체 구조를 재현한다. jsdom 환경에서 실제 네트워크는 불가하므로 불가피한
  모킹에 해당한다.
- **Alternatives considered**:
  - *로컬 Supabase 스택(supabase CLI) 통합 테스트*: RLS 정책까지 실제
    검증되는 장점이 있으나 Docker 의존·CI 부재 환경에서 `npm test` 단일
    게이트를 깨뜨림. 수동 검증(quickstart)으로 대체하고 기각.
  - *fetch 수준 모킹(msw)*: supabase-js 내부 REST 형식에 결합되어 취약.
    기각.

## R6. 인증 의존 seam — 세션 사용자 확인 방법

- **Decision**: 스토어 초기화 시 `supabase.auth.getUser()`로 현재 사용자를
  확인한다. 사용자가 없으면(비로그인/세션 만료) 데이터 요청 없이 로그인
  화면으로 안내한다(기존 가드 흐름 유지). `insert` 시 `user_id`에 세션
  사용자 id를 명시적으로 넣는다(컬럼에 default가 없음).
- **Rationale**: 실제 인증은 별도 기능(FR-010)이지만, 이 기능의 코드는
  Supabase 세션이라는 표준 인터페이스에만 의존하면 되므로 인증 기능이 어떤
  로그인 방식을 쓰든 합류 지점이 동일하다. `auth.uid()` 기반 RLS(R3)와도
  일관된다. 현재의 모의 로그인(`lib/auth.ts`)은 Supabase 세션을 만들지
  못하므로, 인증 기능이 합류하기 전까지 실 서버 E2E는 불가 — 검증 경로를
  단위 테스트 + SQL 수준 확인으로 분리한다(quickstart 참조).
- **Alternatives considered**:
  - *user_id를 클라이언트 상태로 별도 관리*: 세션과 어긋날 수 있는 두 번째
    출처를 만듦. 기각.
  - *이 기능에서 임시 로그인 UI 추가*: 인증 기능과 중복·충돌. 기각(스펙
    범위 밖).

## R7. 저장 컬럼이 없는 속성 처리 — UI 제거와 파생 규칙 (스펙 확정 반영)

- **Decision**: `Post`에서 `emoji`/`cover`/`updated`를 제거하고 관련
  UI(이모지 피커, 커버 밴드·피커, 목록 이모지 열)를 삭제한다. 목록 정렬은
  `created_at` 내림차순(최신 생성 순), 목록 메타·에디터 메타 줄의 시간은
  `rel(created)`로 표시하고 라벨을 "편집됨" → "작성됨"으로 바꾼다. 새 글의
  `title`/`content`는 빈 문자열로 명시 삽입한다(DB의 `'제목없음'` default에
  의존하지 않음 — 목록의 빈 제목 표시 규칙 "제목 없음"과 저장 값을 일치).
- **Rationale**: 스펙 Clarification(2026-07-16)에서 "UI에서 제거 + 생성 시각
  기준"으로 확정됨(FR-009). 빈 제목을 그대로 저장하는 것은 기존 UI 규칙(빈
  제목 → "제목 없음" 표시)과 DB default('제목없음' — 미지정 시에만 적용)의
  충돌을 피하는 가장 단순한 방법이다.
- **Alternatives considered**: 본문 인코딩 보존·클라이언트 전용 유지 — 스펙
  명확화 단계에서 사용자가 기각.

## 미해결 항목

없음 — Technical Context에 NEEDS CLARIFICATION 없음.
