"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";

// 앱 헤더 우측의 로그아웃 버튼. 클릭 시 Supabase 세션을 종료하고 /login 으로 이동.
export default function LogoutButton() {
  const router = useRouter();
  const [hover, setHover] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    await signOut();
    router.replace("/login");
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loggingOut}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title="로그아웃"
      aria-label="로그아웃"
      style={{
        height: 30,
        padding: "0 12px",
        border: "1px solid var(--border-strong)",
        borderRadius: "var(--radius-sm)",
        background: hover ? "var(--surface-subtle)" : "var(--surface-base)",
        color: "var(--text-secondary)",
        fontSize: 13,
        fontWeight: 500,
        cursor: loggingOut ? "default" : "pointer",
        opacity: loggingOut ? 0.6 : 1,
        transition: "background var(--duration-fast) var(--ease-standard)",
      }}
    >
      {loggingOut ? "로그아웃 중…" : "로그아웃"}
    </button>
  );
}
