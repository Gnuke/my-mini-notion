"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthed, signIn } from "@/lib/auth";
import { GoogleIcon } from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const [hover, setHover] = useState(false);

  // Already signed in → skip straight to the workspace.
  useEffect(() => {
    if (isAuthed()) router.replace("/");
  }, [router]);

  function handleLogin() {
    signIn();
    router.replace("/");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface-canvas)",
        padding: 24,
      }}
    >
      <div
        style={{
          width: 380,
          maxWidth: "100%",
          background: "var(--surface-base)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-sm)",
          padding: "48px 40px 40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div
          aria-hidden
          style={{
            width: 44,
            height: 44,
            borderRadius: "var(--radius-lg)",
            background: "var(--accent)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 18,
          }}
        >
          N
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: "var(--tracking-tight)",
            color: "var(--text-primary)",
          }}
        >
          Nook
        </h1>
        <p
          style={{
            margin: "10px 0 34px",
            fontSize: 15,
            lineHeight: 1.55,
            color: "var(--text-tertiary)",
          }}
        >
          개인 업무를 기록하는
          <br />
          나만의 작은 공간
        </p>

        <button
          onClick={handleLogin}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            width: "100%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "11px 18px",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-strong)",
            background: hover ? "var(--surface-subtle)" : "var(--surface-base)",
            color: "var(--text-primary)",
            fontSize: 15,
            fontWeight: 500,
            cursor: "pointer",
            transition: "background var(--duration-base) var(--ease-standard)",
          }}
        >
          <GoogleIcon size={18} />
          구글로 로그인
        </button>

        <p
          style={{
            margin: "22px 0 0",
            fontSize: 12,
            lineHeight: 1.6,
            color: "var(--text-tertiary)",
          }}
        >
          로그인하면 내 글이 이 브라우저에 안전하게 저장됩니다.
        </p>
      </div>
    </main>
  );
}
