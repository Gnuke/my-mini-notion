"use client";

import { useMemo, useState } from "react";
import { useNook } from "@/lib/store";
import { rel } from "@/lib/data";

export default function PostList() {
  const { posts, selectedId, select, newPost } = useNook();
  const [search, setSearch] = useState("");
  const [cmd, setCmd] = useState("");
  const [addHover, setAddHover] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...posts]
      .sort((a, b) => b.updated - a.updated)
      .filter(
        (p) =>
          !q ||
          (p.title || "제목 없음").toLowerCase().includes(q) ||
          (p.body || "").toLowerCase().includes(q)
      );
  }, [posts, search]);

  function runCmd(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const v = cmd.trim().toLowerCase();
    if (v === "/page" || v === "/new" || v.startsWith("/page ")) {
      e.preventDefault();
      newPost();
      setCmd("");
    }
  }

  return (
    <div
      style={{
        width: 256,
        flex: "none",
        background: "var(--surface-canvas)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "15px 14px 11px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600 }}>내 글</span>
        <button
          onClick={() => newPost()}
          onMouseEnter={() => setAddHover(true)}
          onMouseLeave={() => setAddHover(false)}
          style={{
            height: 28,
            padding: "0 11px",
            border: "none",
            borderRadius: "var(--radius-sm)",
            background: addHover ? "var(--accent-hover)" : "var(--accent)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            transition: "background var(--duration-fast) var(--ease-standard)",
          }}
        >
          ＋ 새 글
        </button>
      </div>

      <div style={{ padding: "0 12px 8px" }}>
        <input
          className="nk-inp"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="검색…"
          style={{
            width: "100%",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-sm)",
            padding: "6px 10px",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--text-primary)",
            background: "var(--surface-base)",
            transition: "box-shadow .15s, border-color .15s",
          }}
        />
      </div>

      <div style={{ padding: "0 12px 10px" }}>
        <input
          className="nk-inp"
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          onKeyDown={runCmd}
          placeholder="'/page' 입력 후 Enter"
          style={{
            width: "100%",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            padding: "6px 10px",
            fontFamily: "var(--font-mono)",
            fontSize: 12.5,
            color: "var(--text-secondary)",
            background: "var(--tile-blue)",
            transition: "box-shadow .15s, border-color .15s",
          }}
        />
      </div>

      <div
        style={{
          height: 1,
          background: "var(--border-subtle)",
          margin: "2px 12px 8px",
        }}
      />

      <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 14px" }}>
        {filtered.map((p) => {
          const activeRow = p.id === selectedId;
          const preview =
            (p.body || "").replace(/\n+/g, " ").trim().slice(0, 40) ||
            "내용 없음";
          return (
            <div
              key={p.id}
              onClick={() => select(p.id)}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                padding: "9px 11px",
                cursor: "pointer",
                borderRadius: "var(--radius-md)",
                marginBottom: 1,
                background: activeRow ? "var(--tile-blue)" : "transparent",
                boxShadow: activeRow ? "inset 2.5px 0 0 var(--accent)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!activeRow)
                  e.currentTarget.style.background = "var(--surface-hover)";
              }}
              onMouseLeave={(e) => {
                if (!activeRow)
                  e.currentTarget.style.background = "transparent";
              }}
            >
              <span style={{ fontSize: 17, lineHeight: 1.3, flex: "none" }}>
                {p.emoji}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--text-primary)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginBottom: 2,
                  }}
                >
                  {p.title || "제목 없음"}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {rel(p.updated)} · {preview}
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div
            style={{
              padding: "22px 12px",
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            {search.trim() ? (
              <>검색 결과가 없어요.</>
            ) : (
              <>
                아직 글이 없어요.
                <br />
                ‘＋ 새 글’로 시작하세요.
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
