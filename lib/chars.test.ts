// countChars 계약(C2) 테스트 — 실제 코드, 모킹 없음.
import { describe, expect, test } from "vitest";
import { countChars } from "@/lib/chars";

describe("countChars — 사용자 인지 글자(grapheme) 수", () => {
  test("빈 문자열은 0을 반환한다", () => {
    expect(countChars("")).toBe(0);
  });

  test("한글 문자열은 글자 수만큼 반환한다", () => {
    expect(countChars("안녕하세요")).toBe(5);
  });

  test("공백도 1자로 센다", () => {
    expect(countChars("a b")).toBe(3);
  });

  test("줄바꿈도 1자로 센다", () => {
    expect(countChars("가\n나")).toBe(3);
  });

  test("단일 이모지는 1자로 센다", () => {
    expect(countChars("😀")).toBe(1);
  });

  test("조합 이모지(ZWJ 시퀀스)는 1자로 센다", () => {
    expect(countChars("👨‍👩‍👧")).toBe(1);
  });

  test("국기 이모지는 1자로 센다", () => {
    expect(countChars("🇰🇷")).toBe(1);
  });
});
