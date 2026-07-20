-- 002-supabase-page-crud: public.page RLS 정책 4개 (research.md R3)
-- 로그인된(authenticated) 사용자가 자신의 글(auth.uid() = user_id)만
-- 조회/등록/수정/삭제할 수 있게 한다. anon 대상 정책은 만들지 않는다
-- (비로그인 접근 전면 거부 — FR-001, SC-003).
-- 테이블 구조(컬럼·제약)는 변경하지 않는다 (FR-005).

create policy "page_select_own" on public.page
  for select to authenticated
  using (auth.uid() = user_id);

create policy "page_insert_own" on public.page
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "page_update_own" on public.page
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "page_delete_own" on public.page
  for delete to authenticated
  using (auth.uid() = user_id);
