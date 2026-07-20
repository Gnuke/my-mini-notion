# Research: 마이페이지 자기소개 (002-profile-introduction)

**Date**: 2026-07-16 | **Plan**: [plan.md](./plan.md)

Technical Context의 미지수와 통합 지점을 조사한 결과. 모든 NEEDS CLARIFICATION 해소됨.

## R1. DB 접근 경로 — RLS 차단 우회

**Decision**: 서버 전용 Next.js Route Handler(`app/api/profile/introduction/route.ts`)가
서비스 롤 키(`SUPABASE_SERVICE_ROLE_KEY`, 서버 env)로 `public.profile`의
`introduction`만 읽고 쓴다. 클라이언트는 이 API만 호출한다.

**Rationale**: 실제 DB를 조회해 확인한 사실 —

- `public.profile`: RLS enabled, 행 1건. 컬럼 `id, created_at, name, user_id, avatar_url, updated_at, introduction(text, nullable)`
- RLS 정책 3건(`profile_select_own` / `profile_update_own` / `profile_insert_own`)
  전부 `roles={authenticated}`, 조건 `auth.uid() = user_id`
- 앱 인증은 localStorage 모의(`lib/auth.ts`) → Supabase 세션 없음 → 브라우저
  요청은 anon 역할 → SELECT/UPDATE 모두 0행 (차단)

서비스 롤 키는 RLS를 우회하므로 정책을 건드리지 않고 동작한다. 키는 서버
런타임에만 존재하고(NEXT_PUBLIC_ 금지), 라우트는 introduction 필드만 노출해
피해 반경을 최소화한다.

**Alternatives considered**:
- 클라이언트 anon 직접 접근 — RLS에 막혀 불가능 (실측 정책 확인)
- RLS 정책 추가/완화(anon 허용) — DB 변경이므로 사용자 제약 위반, 기각
- 실제 Supabase Auth 로그인 도입 — 로그인 흐름 전면 교체, 범위 밖 + FR-009 위반, 기각
- Supabase 익명 로그인(signInAnonymously) — 새 auth.uid()가 기존 행의 user_id와
  달라 여전히 차단되고 auth 스키마에 사용자가 쌓임(사실상 DB 변경), 기각

## R2. 대상 행 식별

**Decision**: `select id, introduction from profile order by created_at asc limit 1`
로 첫 행을 읽고, 갱신은 그 `id`로 `update`한다.

**Rationale**: 스펙 가정 — 단일 사용자 프로토타입, profile 행 1건(실측 일치).
`limit 1 + order by`로 행이 늘어나도 결정적으로 동작한다. 모의 인증이라
`user_id` 매칭 근거가 없으므로 "첫 행"이 가장 단순하고 정직한 규칙이다.

**Alternatives considered**: user_id 하드코딩(환경별로 깨지고 비밀값 관리 증가, 기각),
`.single()` 무조건 사용(행 0/2건 시 에러 — 0건이면 오류 안내가 스펙상 맞으므로
0건은 오류 처리로 흡수, 2건 이상은 첫 행 규칙 적용)

## R3. 미등록 상태의 데이터 표현

**Decision**: 미등록 = `NULL`. 저장 시 `trim` 결과가 빈 문자열이면 `NULL`을
저장한다(`normalizeIntroduction`). 조회 시 `NULL`/빈 문자열 모두 미등록으로
취급한다. 내용이 있으면 입력 그대로(앞뒤 공백 포함) 저장한다.

**Rationale**: FR-005(모두 지우거나 공백·줄바꿈만 남기면 미등록 복귀)를
컬럼이 nullable인 점과 정합하게 구현. 내용 자체는 trim하지 않아 "입력한
그대로 저장"(엣지 케이스: 이모지·줄바꿈 유지)과 충돌하지 않는다.

**Alternatives considered**: 빈 문자열로 통일(NULL과 ''의 이중 표현이 남아
조회 분기 필요 — 어차피 조회는 양쪽 처리하므로 저장은 NULL로 정규화가 깔끔), 기각

## R4. 500자 제한 계산과 입력 가드

**Decision**: 기존 `lib/chars.ts`의 `countChars`(Intl.Segmenter, grapheme)를
재사용한다. textarea `maxLength`는 쓰지 않는다(UTF-16 단위라 이모지 오차).
onChange 가드: 새 값이 500자 이하이거나 **현재 값보다 짧아지는 변경**이면
수용, 아니면 무시. 저장 시 `countChars > 500`이면 요청 없이 한국어 안내를
표시한다(레거시 초과 데이터 보호 규칙).

**Rationale**: 스펙이 001 카운터와 동일한 글자 단위를 명시(Assumptions).
"짧아지는 변경 허용" 규칙이 FR-008의 두 조항(신규 초과 입력 차단 + 레거시
초과 데이터는 그대로 표시하고 잘라내기 금지)을 동시에 만족한다 — 500자 초과
저장본을 불러온 상태에서도 삭제·축소 편집이 가능하다.

**Alternatives considered**: `maxLength` 속성(grapheme 불일치 + 레거시 초과
데이터 표시 불가, 기각), 저장 시에만 검증(입력 중 제한 인지 불가 — FR-008의
"제한을 알 수 있어야" 미충족, 카운터 `N/500자` 표시와 입력 가드 병행으로 해결)

## R5. 클라이언트 상태 위치와 로딩 게이트

**Decision**: 자기소개 상태(값·로딩/오류 플래그)는 마이페이지 컴포넌트
로컬 상태로 둔다. `lib/store.tsx`는 수정하지 않고, localStorage에도
introduction을 넣지 않는다(DB 단일 원천). 화면은
`store.loaded && intro 요청 settle(성공 또는 실패)` 전까지 기존 로딩 패턴
(`<div style={{flex:1, background:var(--surface-base)}} />`)을 유지한다.
불러오기 실패 시 화면은 표시하되 자기소개 영역을 오류 상태로 렌더하고
textarea를 비활성화한다(모르는 내용 덮어쓰기 방지).

**Rationale**: 자기소개는 마이페이지에서만 쓰인다(스펙 Assumptions — 다른
화면 노출 범위 밖) → 전역 스토어 확장은 YAGNI 위반. 로딩 게이트는
Clarifications "불러온 뒤 표시" 확정 사항과 기존 마이페이지 패턴을 그대로
따른다. localStorage 캐시를 두지 않아 "마지막 저장본 표시" 규칙이 항상 DB
기준으로 성립한다.

**Alternatives considered**: NookProvider 확장(전 화면 리렌더 영향 + 사용처
단일 — 기각), localStorage 캐싱(이중 원천으로 stale 충돌, FR-003 위반 소지 — 기각)

## R6. 저장 버튼 연동

**Decision**: 기존 "변경 사항 저장" 버튼의 onClick을 async 저장 핸들러로
바꾼다: `PUT /api/profile/introduction` 성공 시에만 기존 `flash()`
("저장되었습니다 ✓") 호출, 실패 시 한국어 오류 문구를 버튼 옆에 표시하고
입력값은 그대로 유지. 별명·아바타의 즉시 반영(localStorage 자동 저장) 동작은
변경하지 않는다(FR-009).

**Rationale**: Clarifications 확정 — 전용 버튼·자동 저장 없이 기존 버튼 공용.
성공 시에만 flash를 호출해야 FR-006/FR-007(성공 확인 vs 실패 안내)이 분리된다.
현재 버튼은 무조건 flash만 하므로(DESIGN.md §4.6) 이 동작 변경은 자기소개
저장 의미가 추가된 것 — DESIGN.md §4.6도 같은 커밋에서 갱신한다(원칙 V).

**Alternatives considered**: 저장 중 버튼 비활성화 + 로딩 스피너(단일 사용자
로컬 환경에서 왕복이 짧고 스펙 요구 없음 — 중복 클릭은 멱등 PUT이라 무해,
YAGNI로 미도입. 연타 시 마지막 응답 기준 표시)

## R7. 의존성·환경 변수

**Decision**: `@supabase/supabase-js` v2를 dependencies에 추가(서버 라우트
전용 import). 환경 변수는 기존 `NEXT_PUBLIC_SUPABASE_URL` 재사용 +
`SUPABASE_SERVICE_ROLE_KEY` 신규(서버 전용). `.env.example`에 항목과 주석을
추가하고, `.env.local` 반영은 보호 훅 때문에 **사용자가 직접** 해야 한다
(quickstart.md에 절차 기재).

**Rationale**: supabase-js는 PostgREST 호출·에러 처리를 검증된 형태로
제공한다. 서비스 롤 키를 NEXT_PUBLIC_로 노출하면 브라우저에서 RLS 전체
우회가 가능해지므로 반드시 서버 전용으로 유지한다.

**Alternatives considered**: supabase-js 없이 PostgREST REST 직접 fetch(헤더·
에러 포맷 수작업, 이득 없음 — 기각), Prisma/Drizzle 등 ORM(테이블 1개 컬럼
1개 접근에 과함 — YAGNI 기각)

## R8. 테스트 전략 (원칙 I 정합)

**Decision**:
- `lib/introduction.test.ts`: `normalizeIntroduction`(trim→NULL 규칙),
  한도 초과 판정, fetch 헬퍼의 성공/실패 매핑 — global fetch를 vi.stubGlobal로
  최소 모킹(외부 네트워크 경계만)
- `app/api/profile/introduction/route.test.ts`: GET/PUT 계약(200/400/500,
  본문 스키마) — supabase-js가 내부적으로 쓰는 fetch를 스텁해 supabase-js
  실제 코드는 그대로 실행
- `app/(app)/mypage/page.test.tsx`: RTL로 로딩 게이트, 미등록 placeholder,
  등록→저장 성공 flash, 저장 실패 문구+입력 보존, 불러오기 실패 오류
  상태(placeholder와 구분·비활성화), 카운터, 500자 가드, 별명 기능 무회귀 —
  `/api` fetch만 모킹

**Rationale**: 헌법 모킹 규칙 — 실제로 외부적인 최하위 연산(HTTP)만 모킹하고
앱 코드·supabase-js는 실제로 실행한다. 모의 응답은 PostgREST 실제 응답
구조를 반영한다.

**Alternatives considered**: supabase-js 모듈 전체 mock(모의 동작 검증으로
변질 위험 — 최소화 원칙 위반, 기각), 실제 Supabase 연동 E2E(로컬 스택 부재,
비밀키 필요 — 수동 검증은 quickstart.md로 대체)

## 미해결 항목

없음 — Technical Context에 NEEDS CLARIFICATION 잔여 0건.
