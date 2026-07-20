// 세션 갱신 + 라우트 가드.
// - 미로그인 사용자가 앱 경로(/, /mypage 등)에 접근하면 /login 으로 보낸다.
// - 로그인 사용자가 /login 에 접근하면 /(업무 페이지) 로 보낸다.
// - /auth/* (OAuth 콜백)와 정적 자산은 통과시킨다.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() 는 매 요청마다 세션을 검증(갱신)한다.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/login";
  const isAuthFlow = pathname.startsWith("/auth");

  if (!user && !isLogin && !isAuthFlow) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // 갱신된 세션 쿠키를 담은 response 를 그대로 반환해야 한다.
  return response;
}

export const config = {
  matcher: [
    // 정적 자산·이미지·폰트를 제외한 모든 경로.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
