# Quickstart: 페이지 게시글 서버 저장 및 사용자별 접근 제어

**Feature**: 002-supabase-page-crud | **Date**: 2026-07-16

기능이 끝까지 동작함을 증명하는 검증 가이드. 세부 규칙은
[data-model.md](./data-model.md)와 [contracts/](./contracts/) 참조.

## 1. 전제 조건

1. Node.js 18+ / npm.
2. 의존성 설치(신규 패키지 포함):

   ```powershell
   npm install
   ```

3. 환경변수 — `.env.example`을 복사해 `.env.local` 생성 후 실제 값 입력
   (Supabase 대시보드 → Settings → API):

   ```powershell
   Copy-Item .env.example .env.local
   ```

4. RLS 마이그레이션 적용 — `supabase/migrations/20260716_page_rls_policies.sql`
   (Supabase MCP `apply_migration` 또는 대시보드 SQL Editor로 적용).

## 2. 자동 검증 — `npm test` (완료 게이트)

```powershell
npm test
```

기대 결과: 전체 통과, 출력 무결(에러·경고 없음). 이 기능이 추가하는 테스트:

- `lib/pages.test.ts` — row↔Post 매핑(`content: null → ""` 포함), CRUD 호출
  형태, Supabase 오류의 예외 전파.
- `lib/store.test.tsx` — 로딩 상태, 세션 없음 처리, 목록 조회 성공/실패·재시도,
  생성/수정(디바운스·flush)/삭제, "저장됨"이 서버 성공 후에만 켜짐(FR-012),
  실패 시 로컬 내용 유지(FR-007), localStorage에 글 데이터 미기록(FR-006).
- `components/*.test.tsx` — 로딩 문구가 빈 상태 문구를 대체(FR-011), 시간
  표시 `작성됨`/`rel(created)`, 저장 표시 상태 4종, 이모지·커버 UI 부재.

## 3. DB 수준 검증 (SQL — Supabase MCP 또는 대시보드)

```sql
-- 정책 4개 존재 확인 (기대: select/insert/update/delete 각 1개, roles={authenticated})
select polname, polcmd from pg_policy where polrelid = 'public.page'::regclass;

-- 테이블 구조가 변경되지 않았는지 확인 (기대: id/created_at/title/content/user_id 5개 컬럼)
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'page' order by ordinal_position;
```

**검증 기록 (2026-07-16, 구현 세션)**: 마이그레이션
`page_rls_policies` 적용 후 두 쿼리 실행 — 정책 4개(polcmd r/a/w/d, roles
`{authenticated}`, 조건 `auth.uid() = user_id`, UPDATE는 USING+WITH CHECK
모두) 확인, 컬럼 5개 구조 불변 확인. `anon` 대상 정책 없음(비로그인 접근
전면 거부 — SC-003).

## 4. 수동 E2E 검증 (실제 인증 기능 합류 후)

> 이 기능은 로그인된 Supabase 세션을 전제로 한다(FR-010 — 인증은 별도 기능).
> 인증 기능이 합류하기 전에는 §2·§3까지가 검증 범위다.

`npm run dev` 후 (계정 A, 계정 B 준비):

| # | 시나리오 | 기대 결과 | 근거 |
| --- | --- | --- | --- |
| 1 | 로그인 직후 목록 표시 전 | `불러오는 중…` 문구, 빈 상태 문구 미노출 | FR-011 |
| 2 | 새 글 생성 → 제목·본문 입력 → 입력 멈춤 | 잠시 후 `저장됨 ✓` (입력 즉시 아님) | FR-012 |
| 3 | 새로고침 / 로그아웃 후 재로그인 / 다른 브라우저 로그인 | 글 목록·내용 동일 유지 | SC-001/004 |
| 4 | 글 삭제(확인 팝오버) 후 새로고침 | 삭제된 글 미복귀 | US1-5 |
| 5 | 계정 B로 로그인 | A의 글 미노출, B의 글만 표시 | SC-002 |
| 6 | (개발자 도구) B 세션으로 A 글 id `update`/`delete`/`select` 호출 | 모두 거부(0 rows / error) | US2-2 |
| 7 | 비로그인 상태로 `/` 접근 | 로그인 화면으로 이동 | US3 |
| 8 | (개발자 도구 Network offline) 편집 계속 | `저장 실패` 표시 + 입력 내용 화면 유지, online 복귀 후 저장 성공 시 해제 | FR-007 |
| 9 | 글 0개 계정 로그인 | 로딩 후 `아직 글이 없어요` 빈 상태 | Edge Case |
| 10 | 목록·에디터에서 이모지/커버 UI 확인 | 존재하지 않음, 시간은 `N일 전 작성됨` 형식 | FR-009 |

## 5. 문서 동기화 확인 (원칙 V)

- [x] DESIGN.md §4.2 / §4.3 / §5가 [contracts/page-ui.md](./contracts/page-ui.md)
  §4 매핑대로 갱신되었는가 (구현과 같은 커밋 단위). — 2026-07-16 §3.2/§3.3/
  §4.2/§4.3/§4.5/§4.7/§5/§8.2 갱신 완료
- [x] 스펙·플랜과 코드가 어긋난 채 종료하지 않았는가. — 계약 문서
  (page-store.md §3: `saveFailed` 연산 구분·`flash` 유지)도 최종 구현과 동기화

**게이트 기록 (2026-07-16)**: `npm test` 7파일 58테스트 전체 통과·출력 무결,
`npx tsc --noEmit` 0 에러, `npm run build` 성공. `npm run lint`는 프로젝트에
ESLint 설정이 없는 기존 상태(최초 대화형 설정 필요)라 실행 불가 — 타입
검사·테스트로 대체. §4 수동 E2E는 실제 인증 기능 합류 후 수행(FR-010 의존).

## 6. 성공 기준 매핑

| SC | 검증 방법 |
| --- | --- |
| SC-001 (유실 0건) | §4-3, §4-4 + `lib/store.test.tsx` |
| SC-002 (격리 0건 노출) | §4-5, §4-6 + RLS 정책(§3) |
| SC-003 (비로그인 등록 경로 0개) | §4-7 + RLS `to authenticated`(§3) |
| SC-004 (기기 간 동일) | §4-3 |
| SC-005 (목록 3초 이내) | §4-1 체감 확인 (1회 select — R1) |
