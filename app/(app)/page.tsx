"use client";

import { useNook } from "@/lib/store";
import PostList from "@/components/PostList";
import Editor from "@/components/Editor";
import EmptyState from "@/components/EmptyState";

export default function WorkspacePage() {
  const { loaded, active } = useNook();

  // Wait for the client-side store to hydrate before rendering data-driven UI.
  if (!loaded) {
    return <div style={{ flex: 1, background: "var(--surface-base)" }} />;
  }

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
        {active ? <Editor /> : <EmptyState />}
      </div>
    </>
  );
}
