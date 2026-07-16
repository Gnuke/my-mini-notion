"use client";

import { useState } from "react";
import { useNook } from "@/lib/store";
import IconRail from "@/components/IconRail";
import PostList from "@/components/PostList";
import Editor from "@/components/Editor";
import EmptyState from "@/components/EmptyState";

export default function WorkspacePage() {
  const { loaded, active } = useNook();
  const [collapsed, setCollapsed] = useState(false);

  const rail = (
    <IconRail
      collapsed={collapsed}
      onToggleSidebar={() => setCollapsed((c) => !c)}
    />
  );

  // Wait for the client-side store to hydrate before rendering data-driven UI.
  if (!loaded) {
    return (
      <>
        {rail}
        <div style={{ flex: 1, background: "var(--surface-base)" }} />
      </>
    );
  }

  return (
    <>
      {rail}
      {/* 접힘 중에도 PostList 마운트 유지 — 언마운트하면 검색어가 초기화됨 (FR-005) */}
      <div style={{ display: collapsed ? "none" : "contents" }}>
        <PostList />
      </div>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          background: "var(--surface-base)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {active ? <Editor /> : <EmptyState />}
      </div>
    </>
  );
}
