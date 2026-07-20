// page 테이블 CRUD + row ↔ Post 매핑 (contracts/page-store.md §2).
// 소유자 검증은 클라이언트에서 하지 않는다 — DB의 RLS 정책이 본인 행만
// 반환·허용한다 (data-model.md §3·§4).
import { getSupabase } from "@/lib/supabase/client";
import type { Post } from "@/lib/data";

export interface PageRow {
  id: string;
  title: string;
  content: string | null;
  created_at: string;
  user_id: string;
}

export function mapRow(row: PageRow): Post {
  return {
    id: row.id,
    title: row.title,
    body: row.content ?? "",
    created: Date.parse(row.created_at),
  };
}

export async function fetchPages(): Promise<Post[]> {
  const { data, error } = await getSupabase()
    .from("page")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error("글 목록 조회 실패: " + error.message);
  return ((data ?? []) as PageRow[]).map(mapRow);
}

export async function createPage(userId: string): Promise<Post> {
  // title/content를 빈 문자열로 명시 삽입 — DB default('제목없음')에
  // 의존하지 않고 UI의 빈 제목 표시 규칙과 저장 값을 일치시킨다 (R7).
  const { data, error } = await getSupabase()
    .from("page")
    .insert({ title: "", content: "", user_id: userId })
    .select()
    .single();
  if (error) throw new Error("글 등록 실패: " + error.message);
  return mapRow(data as PageRow);
}

export async function updatePage(
  id: string,
  fields: { title?: string; body?: string }
): Promise<void> {
  const payload: { title?: string; content?: string } = {};
  if (fields.title !== undefined) payload.title = fields.title;
  if (fields.body !== undefined) payload.content = fields.body;
  const { error } = await getSupabase()
    .from("page")
    .update(payload)
    .eq("id", id);
  if (error) throw new Error("글 저장 실패: " + error.message);
}

export async function deletePage(id: string): Promise<void> {
  const { error } = await getSupabase().from("page").delete().eq("id", id);
  if (error) throw new Error("글 삭제 실패: " + error.message);
}
