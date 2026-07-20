// 프로필 API 공용 서버 헬퍼 (004-profile-db)
// - 신원 확인: 쿠키 세션(anon 서버 클라이언트)에서 로그인 유저를 읽는다.
// - 데이터 접근: 서버 전용 서비스 롤 키로 본인(user_id) profile 행만 조회·갱신한다.
//   서비스 롤 키는 서버 라우트 밖으로 절대 노출하지 않는다.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** 서비스 롤 클라이언트 — Next.js 데이터 캐시를 우회(no-store)한다. */
export function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

/** 쿠키 세션에서 로그인 유저 id를 얻는다. 미로그인·확인 실패 시 null. */
export async function getSessionUserId(): Promise<string | null> {
  try {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/** 로그인 유저 본인의 profile 행 조회 (user_id 기준). */
export async function selectMyProfile(
  supabase: SupabaseClient,
  userId: string,
  columns: string
): Promise<{ row: Record<string, unknown> | null; failed: boolean }> {
  const { data, error } = await supabase
    .from("profile")
    .select(columns)
    .eq("user_id", userId)
    .limit(1);
  if (error) return { row: null, failed: true };
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  return { row: rows[0] ?? null, failed: false };
}
