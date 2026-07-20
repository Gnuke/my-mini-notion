// 구글 OAuth 리다이렉트 착지점.
// Supabase 가 ?code=... 를 붙여 여기로 돌려보내면, 그 인가 코드를
// 세션으로 교환(PKCE)하고 세션 쿠키를 심은 뒤 업무 페이지로 이동시킨다.
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 코드가 없거나 교환 실패 → 로그인 화면으로 에러 표시와 함께 복귀.
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
