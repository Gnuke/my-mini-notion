// 인증 헬퍼 — Supabase Auth (Google OAuth 2.0).
//
// 이전에는 localStorage 플래그(nook-auth)로 로그인을 흉내 냈지만, 이제
// 실제 구글 로그인/로그아웃을 수행한다. 세션은 @supabase/ssr 이 쿠키에
// 저장하므로 미들웨어(서버 가드)와 클라이언트가 세션을 공유한다.
"use client";

import { getSupabaseBrowser } from "./supabase/client";

/** 구글 OAuth 동의 화면으로 이동한다. 성공 시 /auth/callback 으로 돌아온다. */
export async function signInWithGoogle() {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
}

/** 로그아웃 — 세션 쿠키를 제거한다. 이후 라우팅은 호출부/미들웨어가 처리. */
export async function signOut() {
  const supabase = getSupabaseBrowser();
  await supabase.auth.signOut();
}
