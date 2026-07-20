"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { NookProvider } from "@/lib/store";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import IconRail from "@/components/IconRail";
import LogoutButton from "@/components/LogoutButton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // undefined = 확인 전, null = 미로그인, User = 로그인됨
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const supabase = getSupabaseBrowser();

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
        setUser(null);
        return;
      }
      setUser(data.user);
    });

    // 로그아웃·세션 만료를 감지해 로그인 화면으로 보낸다.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        router.replace("/login");
      } else {
        setUser(session.user);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [router]);

  // 인증 확인 전(또는 미로그인)에는 빈 캔버스만 — 앱 플래시 방지.
  if (!user) {
    return (
      <div
        style={{
          height: "100vh",
          background: "var(--surface-canvas)",
        }}
      />
    );
  }

  return (
    <NookProvider user={user}>
      <div
        style={{
          height: "100vh",
          display: "flex",
          background: "var(--surface-base)",
          color: "var(--text-primary)",
          overflow: "hidden",
        }}
      >
        <IconRail />
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <header
            style={{
              height: 44,
              flex: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              padding: "0 16px",
              borderBottom: "1px solid var(--border-subtle)",
              background: "var(--surface-base)",
            }}
          >
            <LogoutButton />
          </header>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              overflow: "hidden",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </NookProvider>
  );
}
