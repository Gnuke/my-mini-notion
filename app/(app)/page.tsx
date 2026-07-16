"use client";

import { useNook } from "@/lib/store";
import PostList from "@/components/PostList";
import Editor from "@/components/Editor";
import EmptyState from "@/components/EmptyState";

export default function WorkspacePage() {
  const { loading, loadError, active } = useNook();

  return (
    <>
      <PostList />
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
