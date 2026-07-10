"use client";

import { useState } from "react";
import { useNook } from "@/lib/store";

export default function MyPage() {
  const { loaded, profile, setNickname, setAvatar, saved, flash } = useNook();
  const [saveHover, setSaveHover] = useState(false);

  if (!loaded) {
    return <div style={{ flex: 1, background: "var(--surface-base)" }} />;
  }

  const initial = (profile.nickname || "?").trim().charAt(0) || "?";

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(f);
  }

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: "var(--surface-base)",
        overflowY: "auto",
      }}
    >
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "56px 40px 100px" }}>
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "var(--tracking-tight)",
            marginBottom: 6,
          }}
        >
          마이 페이지
        </div>
        <div
          style={{
            fontSize: 14,
            color: "var(--text-tertiary)",
            marginBottom: 34,
          }}
        >
          프로필을 편집하고, 별명과 프로필 이미지를 업데이트하세요.
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginBottom: 32,
          }}
        >
          <label style={{ position: "relative", cursor: "pointer", flex: "none" }}>
            <span
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                overflow: "hidden",
                background: "var(--tile-blue)",
                color: "var(--blue-700)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
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
            <span
              style={{
                position: "absolute",
                right: -2,
                bottom: -2,
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "var(--surface-base)",
                border: "1px solid var(--border-strong)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
              }}
            >
              📷
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={onUpload}
              style={{ display: "none" }}
            />
          </label>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              {profile.nickname}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
              {profile.email}
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            fontWeight: 500,
            marginBottom: 6,
          }}
        >
          별명
        </div>
        <input
          className="nk-inp"
          value={profile.nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="별명"
          style={{
            width: "100%",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-sm)",
            padding: "9px 11px",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--text-primary)",
            background: "var(--surface-base)",
            marginBottom: 18,
            transition: "box-shadow .15s, border-color .15s",
          }}
        />

        <div
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            fontWeight: 500,
            marginBottom: 6,
          }}
        >
          이메일
        </div>
        <input
          value={profile.email}
          disabled
          style={{
            width: "100%",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            padding: "9px 11px",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--text-tertiary)",
            background: "var(--surface-subtle)",
            marginBottom: 30,
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={() => flash()}
            onMouseEnter={() => setSaveHover(true)}
            onMouseLeave={() => setSaveHover(false)}
            style={{
              height: 40,
              padding: "0 18px",
              border: "none",
              borderRadius: "var(--radius-sm)",
              background: saveHover ? "var(--accent-hover)" : "var(--accent)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              transition: "background var(--duration-fast) var(--ease-standard)",
            }}
          >
            변경 사항 저장
          </button>
          {saved && (
            <span style={{ fontSize: 13, color: "var(--text-success)" }}>
              저장되었습니다 ✓
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
