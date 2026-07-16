// GET/PUT /api/profile/introduction — 자기소개 조회/저장 (002-profile-introduction)
//
// profile 테이블의 RLS가 authenticated 전용인데 앱 인증은 모의(localStorage)라
// 클라이언트 anon 접근이 불가능하다. DB(스키마·정책)는 변경 금지 제약이므로
// 서버 전용 서비스 롤 키로 introduction 컬럼만 읽고 쓴다.
// 서비스 롤 키는 이 서버 라우트 밖으로 절대 노출하지 않는다.
import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isIntroTooLong, normalizeIntroduction } from "@/lib/introduction";

function getClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** 단일 사용자 프로토타입 규칙: created_at 오름차순 첫 행이 대상 (research.md R2). */
async function selectFirstProfile(
  supabase: SupabaseClient,
  columns: string
): Promise<{ row: Record<string, unknown> | null; failed: boolean }> {
  const { data, error } = await supabase
    .from("profile")
    .select(columns)
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) return { row: null, failed: true };
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  return { row: rows[0] ?? null, failed: false };
}

export async function GET() {
  const supabase = getClient();
  if (!supabase) {
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }

  const { row, failed } = await selectFirstProfile(supabase, "id, introduction");
  if (failed) {
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "PROFILE_NOT_FOUND" }, { status: 500 });
  }

  return NextResponse.json({
    introduction: normalizeIntroduction(row.introduction as string | null),
  });
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || !("introduction" in body)) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const raw = (body as { introduction: unknown }).introduction;
  if (raw !== null && typeof raw !== "string") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const value = normalizeIntroduction(raw);
  if (value !== null && isIntroTooLong(value)) {
    return NextResponse.json({ error: "TOO_LONG" }, { status: 400 });
  }

  const supabase = getClient();
  if (!supabase) {
    return NextResponse.json({ error: "SAVE_FAILED" }, { status: 500 });
  }

  const { row, failed } = await selectFirstProfile(supabase, "id");
  if (failed) {
    return NextResponse.json({ error: "SAVE_FAILED" }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "PROFILE_NOT_FOUND" }, { status: 500 });
  }

  const { error } = await supabase
    .from("profile")
    .update({ introduction: value })
    .eq("id", row.id as string);
  if (error) {
    return NextResponse.json({ error: "SAVE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ introduction: value });
}
