"use client";

import { useState } from "react";
import { useNook } from "@/lib/store";

export default function EmptyState() {
  const { newPost } = useNook();
  const [hover, setHover] = useState(false);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 40,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 46 }}>🗒️</div>
      <div
        style={{ fontSize: 17, fontWeight: 600, color: "var(--text-secondary)" }}
      >
        열려 있는 글이 없어요
      </div>
      <div
        style={{
          fontSize: 14,
          color: "var(--text-tertiary)",
          lineHeight: 1.6,
          maxWidth: 320,
        }}
      >
        왼쪽 목록에서 글을 고르거나, 새 글을 만들어 기록을 시작하세요.
      </div>
      <button
        onClick={() => newPost()}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          marginTop: 6,
          height: 32,
          padding: "0 14px",
          border: "none",
          borderRadius: "var(--radius-sm)",
          background: hover ? "var(--accent-hover)" : "var(--accent)",
          color: "#fff",
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
          transition: "background var(--duration-fast) var(--ease-standard)",
        }}
      >
        ＋ 새 글 만들기
      </button>
    </div>
  );
}
