// Supabase 브라우저 클라이언트 (쿠키 기반 세션).
// @supabase/ssr 의 createBrowserClient 는 세션을 쿠키에 저장하므로
// 미들웨어·서버 라우트(서버 클라이언트)와 세션을 공유한다.
// 모듈 싱글턴으로 한 번만 생성해 재사용한다.
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | undefined;

export function getSupabaseBrowser(): SupabaseClient {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserClient;
}
