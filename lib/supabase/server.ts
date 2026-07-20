// Supabase 서버 클라이언트 — OAuth 콜백 라우트 등 서버 코드에서 사용.
// Next.js 14 의 cookies() 는 동기 API 이므로 await 하지 않는다.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component 에서 호출되면 set 이 막힌다.
            // 세션 갱신은 미들웨어가 담당하므로 무시해도 안전하다.
          }
        },
      },
    }
  );
}
