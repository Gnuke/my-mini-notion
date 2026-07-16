# Quickstart: 마이페이지 자기소개 검증 가이드

**Feature**: 002-profile-introduction

## 사전 준비

1. **의존성 설치** (구현이 `@supabase/supabase-js`를 추가한 뒤):

   ```powershell
   npm install
   ```

2. **환경 변수** — `.env.local`에 아래가 있어야 한다. `.env*`는 보호 훅으로
   에이전트가 수정할 수 없으므로 **사용자가 직접** 추가한다
   (값: Supabase 대시보드 → Settings → API):

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=...        # 기존
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # 기존 (이 기능은 미사용이지만 유지)
   SUPABASE_SERVICE_ROLE_KEY=...       # 신규 — 서버 전용. 절대 NEXT_PUBLIC_ 금지
   ```

   항목 템플릿은 `.env.example` 참조.

3. **DB 전제** (변경 금지 — 확인만): `public.profile`에 행 1건,
   `introduction` 컬럼(text, nullable) 존재.

## 자동 검증

```powershell
npm test
```

기대: 전체 통과, 출력 무결(에러·경고 없음). 신규 테스트 —
`lib/introduction.test.ts`, `app/api/profile/introduction/route.test.ts`,
`app/(app)/mypage/page.test.tsx`
(계약 상세: [contracts/](./contracts/introduction-api.md)).

## 수동 검증 (E2E)

```powershell
npm run dev
```

1. `http://localhost:3000/login` → `구글로 로그인` 클릭(모의 인증)
2. 레일 하단 아바타 → 마이페이지 진입
   - **US1-3**: 자기소개 미등록이면 placeholder `자신을 소개하는 글을 남겨보세요` 확인
3. **US1 등록**: 자기소개 입력(줄바꿈 포함) → `변경 사항 저장` →
   `저장되었습니다 ✓` → 새로고침 → 같은 내용 표시 확인
   - Supabase 대시보드 Table Editor에서 `profile.introduction` 값 일치 확인
4. **US2 수정**: 내용 수정 → 저장 → 새로고침 → 수정본 확인.
   전부 지우고 저장 → 새로고침 → placeholder 복귀 (DB 값 NULL 확인)
5. **카운터/한도**: 입력 시 `N/500자` 갱신, 500자 도달 후 추가 입력 무시
6. **US3 저장 실패**: DevTools → Network → Offline → 저장 클릭 →
   `저장에 실패했습니다…` 표시 + 입력 유지 → Online 복귀 → 재저장 성공
7. **US3 불러오기 실패**: Offline 상태로 마이페이지 새로고침 →
   `자기소개를 불러오지 못했습니다…` + 입력 비활성 확인 (placeholder 아님)
8. **무회귀**: 별명 변경이 즉시 레일 아바타 이니셜에 반영되는지(기존 동작),
   이메일 입력이 여전히 비활성인지 확인

## 성공 기준 대조

- SC-001: 2~3단계가 1분 내 완료되는가
- SC-002: 3~4단계 새로고침 후 유실 0건인가
- SC-003: 저장 클릭 → 확인/오류 표시가 즉시 나타나는가
- SC-004: 8단계 기존 기능 회귀 0건인가
