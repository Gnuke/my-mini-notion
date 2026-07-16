// 테마 코어 단위 테스트 — contracts/theme-contract.md C1(저장소)·C3(모듈) 계약 검증.
// localStorage 예외 케이스만 불가피하게 스파이를 사용하고, 나머지는 실제 jsdom 저장소를 쓴다.
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  applyTheme,
  getInitialTheme,
  THEME_INIT_SCRIPT,
  THEME_KEY,
} from "@/lib/theme";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

describe("getInitialTheme — 저장값 읽기 판정 (C1)", () => {
  test("저장값이 없으면 'dark'를 반환한다", () => {
    expect(getInitialTheme()).toBe("dark");
  });

  test("저장값이 'light'이면 'light'를 반환한다", () => {
    localStorage.setItem(THEME_KEY, "light");
    expect(getInitialTheme()).toBe("light");
  });

  test("저장값이 'dark'이면 'dark'를 반환한다", () => {
    localStorage.setItem(THEME_KEY, "dark");
    expect(getInitialTheme()).toBe("dark");
  });

  test("무효한 저장값은 전부 'dark'로 폴백한다", () => {
    for (const bad of ["banana", "LIGHT", ""]) {
      localStorage.setItem(THEME_KEY, bad);
      expect(getInitialTheme()).toBe("dark");
    }
  });

  test("localStorage 접근이 예외를 던지면 throw 없이 'dark'로 폴백한다", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    expect(getInitialTheme()).toBe("dark");
  });
});

describe("applyTheme — DOM 속성 + 저장 (C2·C3)", () => {
  test("html의 data-theme 속성을 설정하고 localStorage에 저장한다", () => {
    applyTheme("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem(THEME_KEY)).toBe("light");

    applyTheme("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
  });

  test("저장이 예외를 던져도 throw 없이 속성은 설정된다", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    expect(() => applyTheme("light")).not.toThrow();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});

describe("THEME_INIT_SCRIPT — 페인트 전 보정 스크립트 (C2)", () => {
  // 스크립트가 실제로 존재하는 문자열인지 먼저 확인하고 실행한다 —
  // 존재하지 않으면 아래 유지(no-op) 테스트가 허위 통과하기 때문.
  function runInitScript() {
    expect(typeof THEME_INIT_SCRIPT).toBe("string");
    expect(THEME_INIT_SCRIPT.length).toBeGreaterThan(0);
    new Function(THEME_INIT_SCRIPT)();
  }

  test("저장값이 없으면 SSR 기본값 dark를 유지한다", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    runInitScript();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  test("저장값이 'light'이면 속성을 light로 바꾼다", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem(THEME_KEY, "light");
    runInitScript();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  test("무효한 저장값이면 dark를 유지한다", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem(THEME_KEY, "banana");
    runInitScript();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  test("localStorage 접근이 예외를 던져도 throw 없이 dark를 유지한다", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    expect(() => runInitScript()).not.toThrow();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
