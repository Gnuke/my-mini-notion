"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useNook } from "@/lib/store";
import { HomeIcon, PlusIcon } from "./icons";

function RailButton({
  title,
  active,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 34,
        height: 34,
        border: "none",
        borderRadius: "var(--radius-md)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: active ? "var(--text-primary)" : "var(--text-tertiary)",
        background: active
          ? "var(--surface-active)"
          : hover
          ? "var(--surface-hover)"
          : "transparent",
        transition: "background var(--duration-fast) var(--ease-standard)",
      }}
    >
      {children}
    </button>
  );
}

export default function IconRail() {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, newPost } = useNook();

  const initial = (profile.nickname || "?").trim().charAt(0) || "?";
  const onMypage = pathname === "/mypage";

  return (
    <nav
      aria-label="주요 탐색"
      style={{
        width: 60,
        flex: "none",
        background: "var(--surface-sidebar)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "12px 0",
      }}
    >
      <div
        title={`${profile.nickname || "나"}의 워크스페이스`}
        style={{
          width: 34,
          height: 34,
          borderRadius: "var(--radius-md)",
          background: "var(--accent)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 600,
          fontSize: 15,
          marginBottom: 8,
        }}
      >
        {initial}
      </div>

      <RailButton
        title="홈"
        active={pathname === "/"}
        onClick={() => router.push("/")}
      >
        <HomeIcon />
      </RailButton>

      <RailButton
        title="새 글"
        onClick={() => {
          newPost();
          router.push("/");
        }}
      >
        <PlusIcon />
      </RailButton>

      <div style={{ flex: 1 }} />

      <button
        title="마이 페이지"
        aria-label="마이 페이지"
        onClick={() => router.push("/mypage")}
        style={{
          width: 38,
          height: 38,
          border: "none",
          background: "transparent",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          padding: 0,
          boxShadow: onMypage ? "0 0 0 2px var(--accent)" : "none",
        }}
      >
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            overflow: "hidden",
            background: "var(--tile-blue)",
            color: "var(--blue-700)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {profile.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            initial
          )}
        </span>
      </button>
    </nav>
  );
}
