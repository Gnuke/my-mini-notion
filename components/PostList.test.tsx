// PostList 모드 전환 토글 테스트 — contracts/theme-contract.md C4 계약 검증.
// 실제 NookProvider로 감싸 실제 스토어·테마 코드를 사용한다 (모킹 없음).
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NookProvider } from "@/lib/store";
import PostList from "@/components/PostList";
import { THEME_INIT_SCRIPT, THEME_KEY } from "@/lib/theme";

function renderPostList() {
  return render(
    <NookProvider>
      <PostList />
    </NookProvider>
  );
}

beforeEach(() => {
  // SSR 기본값과 동일한 초기 상태: 다크 모드
  document.documentElement.setAttribute("data-theme", "dark");
});

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

describe("PostList — 모드 전환 토글 버튼 (C4)", () => {
  test("다크 모드에서 헤더에 '라이트 모드로 전환' 버튼이 있다", () => {
    renderPostList();
    expect(
      screen.getByRole("button", { name: "라이트 모드로 전환" })
    ).toBeInTheDocument();
  });

  test("클릭하면 라이트 모드로 전환되고 라벨이 '다크 모드로 전환'이 된다", async () => {
    const user = userEvent.setup();
    renderPostList();

    await user.click(screen.getByRole("button", { name: "라이트 모드로 전환" }));

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(
      screen.getByRole("button", { name: "다크 모드로 전환" })
    ).toBeInTheDocument();
  });

  test("재클릭하면 다크 모드로 원복된다", async () => {
    const user = userEvent.setup();
    renderPostList();

    await user.click(screen.getByRole("button", { name: "라이트 모드로 전환" }));
    await user.click(screen.getByRole("button", { name: "다크 모드로 전환" }));

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(
      screen.getByRole("button", { name: "라이트 모드로 전환" })
    ).toBeInTheDocument();
  });

  test("토글 클릭은 글 목록에 부수효과가 없다 (새 글 생성 안 됨)", async () => {
    const user = userEvent.setup();
    renderPostList();

    await user.click(screen.getByRole("button", { name: "라이트 모드로 전환" }));

    // 새 글이 생기면 빈 제목 행("제목 없음")이 목록 맨 위에 추가된다.
    expect(screen.queryByText("제목 없음")).not.toBeInTheDocument();
    // 테마 저장 외에 선택 상태도 그대로여야 한다.
    expect(localStorage.getItem(THEME_KEY)).toBe("light");
  });
});

describe("PostList — 선택한 모드 유지 (US3, 재방문 왕복)", () => {
  // "재방문"을 시뮬레이션한다: 언마운트 → SSR 기본값(dark)으로 속성 재설정 →
  // 페인트 전 스크립트 실행 → 재마운트. 저장(applyTheme)과 복원
  // (THEME_INIT_SCRIPT)의 합성이 사용자 시나리오대로 동작하는지 검증.
  function revisit() {
    document.documentElement.setAttribute("data-theme", "dark");
    new Function(THEME_INIT_SCRIPT)();
    return renderPostList();
  }

  test("라이트로 전환한 뒤 재방문하면 라이트가 유지된다", async () => {
    const user = userEvent.setup();
    const first = renderPostList();

    await user.click(screen.getByRole("button", { name: "라이트 모드로 전환" }));
    expect(localStorage.getItem(THEME_KEY)).toBe("light");
    first.unmount();

    revisit();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(
      screen.getByRole("button", { name: "다크 모드로 전환" })
    ).toBeInTheDocument();
  });

  test("다크로 되돌린 뒤 재방문하면 다크가 유지된다", async () => {
    const user = userEvent.setup();
    const first = renderPostList();

    await user.click(screen.getByRole("button", { name: "라이트 모드로 전환" }));
    await user.click(screen.getByRole("button", { name: "다크 모드로 전환" }));
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
    first.unmount();

    revisit();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(
      screen.getByRole("button", { name: "라이트 모드로 전환" })
    ).toBeInTheDocument();
  });
});
