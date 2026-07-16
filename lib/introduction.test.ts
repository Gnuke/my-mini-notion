// lib/introduction 계약 테스트 — normalize·한도·fetch 헬퍼 (002-profile-introduction)
// 모킹은 네트워크 경계(global fetch)만. 모의 JSON은 introduction-api.md 계약 구조 그대로.
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  INTRO_MAX_CHARS,
  fetchIntroduction,
  isIntroTooLong,
  normalizeIntroduction,
  saveIntroduction,
} from "@/lib/introduction";

function stubFetch(response: { ok: boolean; body: unknown }) {
  const fetchMock = vi.fn(async () => ({
    ok: response.ok,
    json: async () => response.body,
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("normalizeIntroduction — 미등록(null) 정규화", () => {
  test("빈 문자열이면 null을 반환한다", () => {
    expect(normalizeIntroduction("")).toBeNull();
  });

  test("공백과 줄바꿈만 있으면 null을 반환한다", () => {
    expect(normalizeIntroduction("  \n\t  ")).toBeNull();
  });

  test("null과 undefined는 null을 반환한다", () => {
    expect(normalizeIntroduction(null)).toBeNull();
    expect(normalizeIntroduction(undefined)).toBeNull();
  });

  test("내용이 있으면 앞뒤 공백·줄바꿈까지 원본 그대로 보존한다", () => {
    expect(normalizeIntroduction("  안녕하세요\n반갑습니다  ")).toBe(
      "  안녕하세요\n반갑습니다  "
    );
  });
});

describe("isIntroTooLong — 500자(사용자 인지 글자) 한도", () => {
  test("한도 상수는 500이다", () => {
    expect(INTRO_MAX_CHARS).toBe(500);
  });

  test("500자는 한도 이내다", () => {
    expect(isIntroTooLong("가".repeat(500))).toBe(false);
  });

  test("501자는 한도 초과다", () => {
    expect(isIntroTooLong("가".repeat(501))).toBe(true);
  });

  test("조합 이모지는 1자로 세어 500개면 한도 이내다", () => {
    expect(isIntroTooLong("👨‍👩‍👧".repeat(500))).toBe(false);
    expect(isIntroTooLong("👨‍👩‍👧".repeat(501))).toBe(true);
  });
});

describe("fetchIntroduction — 조회 헬퍼", () => {
  test("성공 응답이면 introduction 값을 반환한다", async () => {
    const fetchMock = stubFetch({ ok: true, body: { introduction: "소개글" } });

    await expect(fetchIntroduction()).resolves.toBe("소개글");
    expect(fetchMock).toHaveBeenCalledWith("/api/profile/introduction");
  });

  test("미등록이면 null을 반환한다", async () => {
    stubFetch({ ok: true, body: { introduction: null } });

    await expect(fetchIntroduction()).resolves.toBeNull();
  });

  test("실패 응답(500)이면 오류를 던진다", async () => {
    stubFetch({ ok: false, body: { error: "LOAD_FAILED" } });

    await expect(fetchIntroduction()).rejects.toThrow();
  });

  test("네트워크 오류는 그대로 전파된다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      })
    );

    await expect(fetchIntroduction()).rejects.toThrow();
  });
});

describe("saveIntroduction — 저장 헬퍼", () => {
  test("입력값을 그대로 담아 PUT 요청을 보내고 저장된 값을 반환한다", async () => {
    const fetchMock = stubFetch({ ok: true, body: { introduction: "새 소개" } });

    await expect(saveIntroduction("새 소개")).resolves.toBe("새 소개");
    expect(fetchMock).toHaveBeenCalledWith("/api/profile/introduction", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ introduction: "새 소개" }),
    });
  });

  test("공백만 있는 입력은 null로 정규화해 전송하고 null을 반환한다", async () => {
    const fetchMock = stubFetch({ ok: true, body: { introduction: null } });

    await expect(saveIntroduction("  \n ")).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("/api/profile/introduction", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ introduction: null }),
    });
  });

  test("실패 응답이면 오류를 던진다", async () => {
    stubFetch({ ok: false, body: { error: "SAVE_FAILED" } });

    await expect(saveIntroduction("소개")).rejects.toThrow();
  });
});
