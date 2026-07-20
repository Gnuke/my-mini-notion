"use client";

import { useState } from "react";
import { useNook } from "@/lib/store";
import IconRail from "@/components/IconRail";
import PostList from "@/components/PostList";
import Editor from "@/components/Editor";
import EmptyState from "@/components/EmptyState";

export default function WorkspacePage() {
  const { loading, loadError, active } = useNook();
  const [collapsed, setCollapsed] = useState(false);

  const rail = (
    <IconRail
      collapsed={collapsed}
      onToggleSidebar={() => setCollapsed((c) => !c)}
    />
  );

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
        {/* 로딩·조회 실패 안내는 목록 영역이 담당한다 (FR-011). 로딩이 끝난
            뒤에야 에디터 또는 빈 상태를 보여준다. */}
        {loading || loadError ? null : active ? <Editor /> : <EmptyState />}
      </div>
    </>
  );
}
