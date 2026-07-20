// 프로필 이미지 규칙 단위 테스트 (003-profile-image)
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  PROFILE_IMAGE_MAX_BYTES,
  isImageFile,
  isImageTooLarge,
  profileImageUrl,
} from "@/lib/profile-image";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("profileImageUrl — 공개 URL 조합", () => {
  test("환경변수(앞부분) + image_path(뒷부분)를 슬래시 하나로 잇는다", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_PROFILE_IMAGE_BASE_URL",
      "https://cdn.test/storage/v1/object/public/profile-image"
    );

    expect(profileImageUrl("abc.png")).toBe(
      "https://cdn.test/storage/v1/object/public/profile-image/abc.png"
    );
  });

  test("양쪽의 잉여 슬래시는 정리해 잇는다", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_PROFILE_IMAGE_BASE_URL",
      "https://cdn.test/profile-image/"
    );

    expect(profileImageUrl("/abc.png")).toBe(
      "https://cdn.test/profile-image/abc.png"
    );
  });

  test("환경변수가 없거나 경로가 비어 있으면 null", () => {
    vi.stubEnv("NEXT_PUBLIC_PROFILE_IMAGE_BASE_URL", "");
    expect(profileImageUrl("abc.png")).toBeNull();

    vi.stubEnv(
      "NEXT_PUBLIC_PROFILE_IMAGE_BASE_URL",
      "https://cdn.test/profile-image"
    );
    expect(profileImageUrl(null)).toBeNull();
    expect(profileImageUrl("")).toBeNull();
  });
});

describe("업로드 파일 검증", () => {
  test("이미지 MIME 타입만 허용한다", () => {
    expect(isImageFile({ type: "image/png" })).toBe(true);
    expect(isImageFile({ type: "image/svg+xml" })).toBe(true);
    expect(isImageFile({ type: "text/plain" })).toBe(false);
    expect(isImageFile({ type: "" })).toBe(false);
  });

  test("5MB 경계 — 정확히 5MB는 허용, 1바이트라도 넘으면 거부", () => {
    expect(isImageTooLarge({ size: PROFILE_IMAGE_MAX_BYTES })).toBe(false);
    expect(isImageTooLarge({ size: PROFILE_IMAGE_MAX_BYTES + 1 })).toBe(true);
  });
});
