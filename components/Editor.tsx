"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNook } from "@/lib/store";
import { COVERS, CoverKey, EMOJIS, rel } from "@/lib/data";
import { countChars } from "@/lib/chars";

/** Invisible full-screen layer that closes an open popover on outside click. */
function Backdrop({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 10 }}
      aria-hidden
    />
  );
}

export default function Editor() {
  const { active, patch, remove, profile, saved } = useNook();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [delHover, setDelHover] = useState(false);

  const id = active?.id ?? null;
  const charCount = useMemo(
    () => countChars(active?.body ?? ""),
    [active?.body]
  );

  // Auto-size the body textarea to its content when the post changes.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [id, active?.body]);

  // Reset transient UI when switching posts.
  useEffect(() => {
    setEmojiOpen(false);
    setCoverOpen(false);
    setConfirmDel(false);
  }, [id]);

  if (!active) return null;

  const initial = (profile.nickname || "?").trim().charAt(0) || "?";

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Topbar */}
      <div
        style={{
          height: 44,
          flex: "none",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
        }}
      >
        <span
          style={{
            fontSize: 13,
            color: "var(--text-tertiary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          내 글 › {active.title || "제목 없음"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            {saved ? "저장됨 ✓" : "자동 저장"}
          </span>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setConfirmDel(true)}
              onMouseEnter={() => setDelHover(true)}
              onMouseLeave={() => setDelHover(false)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: delHover ? "var(--danger-subtle)" : "transparent",
                border: "none",
                color: "var(--text-danger)",
                fontSize: 13,
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: "var(--radius-sm)",
              }}
            >
              삭제
            </button>
            {confirmDel && (
              <>
                <Backdrop onClose={() => setConfirmDel(false)} />
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 34,
                    zIndex: 20,
                    background: "var(--surface-base)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-lg)",
                    boxShadow: "var(--shadow-lg)",
                    padding: 14,
                    width: 228,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      marginBottom: 12,
                      lineHeight: 1.55,
                    }}
                  >
                    이 글을 삭제할까요?
                    <br />
                    되돌릴 수 없어요.
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 8,
                    }}
                  >
                    <button
                      onClick={() => setConfirmDel(false)}
                      style={{
                        background: "var(--surface-base)",
                        border: "1px solid var(--border-strong)",
                        color: "var(--text-primary)",
                        fontSize: 13,
                        padding: "5px 11px",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                      }}
                    >
                      취소
                    </button>
                    <button
                      onClick={() => {
                        setConfirmDel(false);
                        remove();
                      }}
                      style={{
                        background: "var(--red-500)",
                        border: "none",
                        color: "#fff",
                        fontSize: 13,
                        padding: "5px 11px",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Scroll region */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Cover */}
        {active.cover && (
          <div
            style={{
              position: "relative",
              height: 150,
              background: COVERS[active.cover],
            }}
          >
            <div
              style={{
                position: "absolute",
                right: 18,
                bottom: 12,
                display: "flex",
                gap: 8,
              }}
            >
              <button
                onClick={() => setCoverOpen((v) => !v)}
                style={coverBtnStyle}
              >
                커버 변경
              </button>
              <button
                onClick={() => patch({ cover: null })}
                style={coverBtnStyle}
              >
                삭제
              </button>
            </div>
            {coverOpen && (
              <>
                <Backdrop onClose={() => setCoverOpen(false)} />
                <div
                  style={{
                    position: "absolute",
                    right: 18,
                    bottom: 46,
                    zIndex: 20,
                    background: "var(--surface-base)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-lg)",
                    boxShadow: "var(--shadow-lg)",
                    padding: 9,
                    display: "flex",
                    gap: 7,
                  }}
                >
                  {(Object.keys(COVERS) as CoverKey[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => {
                        patch({ cover: k });
                        setCoverOpen(false);
                      }}
                      style={{
                        width: 36,
                        height: 26,
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid rgba(0,0,0,.08)",
                        cursor: "pointer",
                        background: COVERS[k],
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 56px 140px" }}>
          {!active.cover && (
            <div style={{ paddingTop: 18 }}>
              <button
                onClick={() => patch({ cover: "blue" })}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-tertiary)",
                  fontSize: 13,
                  cursor: "pointer",
                  padding: "4px 6px",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                🖼 커버 추가
              </button>
            </div>
          )}

          {/* Emoji + picker */}
          <div style={{ position: "relative", width: "max-content" }}>
            <div
              onClick={() => setEmojiOpen((v) => !v)}
              style={{
                fontSize: 58,
                lineHeight: 1,
                cursor: "pointer",
                userSelect: "none",
                marginTop: active.cover ? -44 : 12,
                marginBottom: 6,
              }}
            >
              {active.emoji}
            </div>
            {emojiOpen && (
              <>
                <Backdrop onClose={() => setEmojiOpen(false)} />
                <div
                  style={{
                    position: "absolute",
                    top: 70,
                    left: 0,
                    zIndex: 20,
                    background: "var(--surface-base)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-lg)",
                    boxShadow: "var(--shadow-lg)",
                    padding: 8,
                    display: "grid",
                    gridTemplateColumns: "repeat(8, 1fr)",
                    gap: 2,
                    width: 296,
                  }}
                >
                  {EMOJIS.map((em) => (
                    <button
                      key={em}
                      onClick={() => {
                        patch({ emoji: em });
                        setEmojiOpen(false);
                      }}
                      style={{
                        border: "none",
                        background: "transparent",
                        fontSize: 20,
                        padding: 5,
                        borderRadius: "var(--radius-md)",
                        cursor: "pointer",
                        lineHeight: 1,
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "var(--surface-hover)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Title */}
          <input
            value={active.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="제목 없음"
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              background: "transparent",
              fontFamily: "var(--font-sans)",
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: "var(--tracking-tight)",
              color: "var(--text-primary)",
              padding: 0,
              margin: "2px 0 8px",
            }}
          />

          {/* Author meta */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "var(--text-tertiary)",
              marginBottom: 26,
            }}
          >
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                overflow: "hidden",
                background: "var(--tile-blue)",
                color: "var(--tile-blue-text)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 600,
                flex: "none",
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
            <span>{profile.nickname}</span>
            <span>·</span>
            <span>{rel(active.updated)} 편집됨</span>
          </div>

          {/* Body */}
          <textarea
            ref={bodyRef}
            value={active.body}
            onChange={(e) => {
              const el = e.target;
              el.style.height = "auto";
              el.style.height = el.scrollHeight + "px";
              patch({ body: el.value });
            }}
            placeholder="여기에 입력하거나, 왼쪽에서 '/page'로 새 글을 만드세요…"
            style={{
              width: "100%",
              minHeight: 340,
              border: "none",
              outline: "none",
              resize: "none",
              background: "transparent",
              fontFamily: "var(--font-sans)",
              fontSize: 16,
              lineHeight: 1.75,
              color: "var(--text-primary)",
              padding: 0,
              overflow: "hidden",
              display: "block",
            }}
          />
        </div>
      </div>

      <span
        style={{
          position: "absolute",
          right: 18,
          bottom: 12,
          background: "var(--surface-overlay)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-sm)",
          padding: "4px 9px",
          fontSize: 12,
          color: "var(--text-tertiary)",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {charCount}자
      </span>
    </div>
  );
}

const coverBtnStyle: React.CSSProperties = {
  background: "var(--surface-overlay)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-sm)",
  fontSize: 12,
  color: "var(--text-secondary)",
  padding: "4px 9px",
  cursor: "pointer",
};
