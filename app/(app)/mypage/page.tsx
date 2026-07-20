"use client";

import { useEffect, useRef, useState } from "react";
import { useNook } from "@/lib/store";
import IconRail from "@/components/IconRail";
import { countChars } from "@/lib/chars";
import {
  INTRO_MAX_CHARS,
  fetchIntroduction,
  isIntroTooLong,
  saveIntroduction,
} from "@/lib/introduction";
import {
  fetchProfileImagePath,
  isImageFile,
  isImageTooLarge,
  profileImageUrl,
  uploadProfileImage,
} from "@/lib/profile-image";

type IntroStatus = "loading" | "ready" | "load-error";

export default function MyPage() {
  const { loading, profile, setNickname, setAvatar, saved, flash } = useNook();
  const [saveHover, setSaveHover] = useState(false);
  const [introStatus, setIntroStatus] = useState<IntroStatus>("loading");
  const [introduction, setIntroduction] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  // 마운트 동기화가 사용자의 새 업로드를 되돌리지 않도록 하는 가드.
  const imageTouched = useRef(false);

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

  // 프로필 이미지는 DB(profile.image_path)가 단일 원천 — 마운트 시 아바타를
  // 동기화한다. 실패해도 화면을 막지 않는다 (기존 아바타/이니셜 폴백 유지).
  useEffect(() => {
    let alive = true;
    fetchProfileImagePath()
      .then((path) => {
        if (!alive || imageTouched.current) return;
        const url = profileImageUrl(path);
        if (url) setAvatar(url);
      })
      .catch(() => {
        /* 폴백 유지 */
      });
    return () => {
      alive = false;
    };
  }, [setAvatar]);

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
  if (loading || introStatus === "loading") {
    return (
      <>
        <IconRail />
        <div style={{ flex: 1, background: "var(--surface-base)" }} />
      </>
    );
  }

  const initial = (profile.nickname || "?").trim().charAt(0) || "?";

  // 선택 즉시 서버 업로드 — Storage(uuid 파일명) 저장 후 image_path 를 받아
  // 공개 URL로 조합해 반영한다 (lib/profile-image.ts).
  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = ""; // 같은 파일 재선택도 change 이벤트가 나가도록 초기화
    if (!f) return;
    imageTouched.current = true;
    if (!isImageFile(f)) {
      setImageError("이미지 파일만 업로드할 수 있어요.");
      return;
    }
    if (isImageTooLarge(f)) {
      setImageError("이미지는 5MB까지 업로드할 수 있어요.");
      return;
    }
    setImageError(null);
    setUploading(true);
    try {
      const path = await uploadProfileImage(f);
      const url = profileImageUrl(path);
      if (url) setAvatar(url);
      setUploading(false);
    } catch {
      setUploading(false);
      setImageError("이미지 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  return (
    <>
      <IconRail />
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
          <label
            style={{
              position: "relative",
              cursor: uploading ? "default" : "pointer",
              flex: "none",
            }}
          >
            <span
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                overflow: "hidden",
                background: "var(--tile-blue)",
                color: "var(--tile-blue-text)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                fontWeight: 600,
                opacity: uploading ? 0.6 : 1,
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
              aria-label="프로필 이미지 업로드"
              disabled={uploading}
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
            {uploading ? (
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-tertiary)",
                  marginTop: 4,
                }}
              >
                이미지를 업로드하는 중…
              </div>
            ) : imageError ? (
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-danger)",
                  marginTop: 4,
                }}
              >
                {imageError}
              </div>
            ) : null}
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
    </>
  );
}
