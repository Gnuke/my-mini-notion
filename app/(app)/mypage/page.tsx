"use client";

import { useEffect, useState } from "react";
import { useNook } from "@/lib/store";
import { countChars } from "@/lib/chars";
import {
  INTRO_MAX_CHARS,
  fetchIntroduction,
  isIntroTooLong,
  saveIntroduction,
} from "@/lib/introduction";

type IntroStatus = "loading" | "ready" | "load-error";

export default function MyPage() {
  const { loaded, profile, setNickname, setAvatar, saved, flash } = useNook();
  const [saveHover, setSaveHover] = useState(false);
  const [introStatus, setIntroStatus] = useState<IntroStatus>("loading");
  const [introduction, setIntroduction] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  // 자기소개는 localStorage가 아닌 DB가 단일 원천 — 마운트 시 1회 조회.
  useEffect(() => {
    let alive = true;
    fetchIntroduction()
      .then((value) => {
        if (!alive) return;
        setIntroduction(value ?? "");
        setIntroStatus("ready");
      })
      .catch(() => {
        // 저장본 존재 여부를 알 수 없는 상태 — 미등록과 구분해 오류로 표시.
        if (alive) setIntroStatus("load-error");
      });
    return () => {
      alive = false;
    };
  }, []);

  // 500자 이하이거나 기존보다 짧아지는 변경만 수용 — 초과 저장본도 줄이는 편집은 가능.
  function onIntroChange(next: string) {
    if (
      countChars(next) <= INTRO_MAX_CHARS ||
      countChars(next) < countChars(introduction)
    ) {
      setIntroduction(next);
    }
  }

  async function onSave() {
    if (introStatus !== "ready") return;
    if (isIntroTooLong(introduction)) {
      setSaveError("자기소개는 500자까지 저장할 수 있어요.");
      return;
    }
    setSaveError(null);
    try {
      const savedValue = await saveIntroduction(introduction);
      setIntroduction(savedValue ?? "");
      flash();
    } catch {
      setSaveError("저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  // 자기소개까지 준비된 뒤에만 폼을 표시 — 입력 중 저장본이 덮어쓰는 경로 차단.
  if (!loaded || introStatus === "loading") {
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
            marginBottom: 18,
          }}
        />

        <label
          htmlFor="nk-intro"
          style={{
            display: "block",
            fontSize: 13,
            color: "var(--text-secondary)",
            fontWeight: 500,
            marginBottom: 6,
          }}
        >
          자기소개
        </label>
        <textarea
          id="nk-intro"
          className="nk-inp"
          value={introduction}
          onChange={(e) => onIntroChange(e.target.value)}
          disabled={introStatus === "load-error"}
          placeholder={
            introStatus === "load-error"
              ? undefined
              : "자신을 소개하는 글을 남겨보세요"
          }
          style={{
            width: "100%",
            minHeight: 120,
            resize: "none",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-sm)",
            padding: "9px 11px",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--text-primary)",
            background: "var(--surface-base)",
            display: "block",
            marginBottom: 6,
            transition: "box-shadow .15s, border-color .15s",
          }}
        />
        {introStatus === "load-error" ? (
          <div
            style={{
              fontSize: 13,
              color: "var(--text-danger)",
              marginBottom: 30,
            }}
          >
            자기소개를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              fontSize: 12,
              color: isIntroTooLong(introduction)
                ? "var(--text-danger)"
                : "var(--text-tertiary)",
              marginBottom: 30,
            }}
          >
            {countChars(introduction)}/{INTRO_MAX_CHARS}자
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={onSave}
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
          {saveError && (
            <span style={{ fontSize: 13, color: "var(--text-danger)" }}>
              {saveError}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
