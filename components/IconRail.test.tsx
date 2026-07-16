// IconRail 토글 버튼·접힘 스트립 모드 계약(contracts/sidebar-collapse-ui.md §1·§3)
// 테스트 — 실제 스토어(NookProvider) 사용. next/navigation만 모킹(jsdom에
// App Router 런타임이 없어 불가피 — specs/002 research R7).
import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IconRail from "@/components/IconRail";
import { NookProvider } from "@/lib/store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

function renderRail(props?: {
  collapsed?: boolean;
  onToggleSidebar?: () => void;
}) {
  return render(
    <NookProvider>
      <IconRail {...props} />
    </NookProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("IconRail — 토글 버튼 렌더 조건 (FR-009)", () => {
  test("프롭 없이 렌더하면 토글 버튼이 없고 기존 탐색 요소는 렌더된다", () => {
    renderRail();

    expect(
      screen.queryByRole("button", { name: "사이드바 접기" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "사이드바 펼치기" })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "홈" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "새 글" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "마이 페이지" })
    ).toBeInTheDocument();
  });

  test("onToggleSidebar를 주면 '사이드바 접기' 버튼이 렌더되고 클릭 시 콜백이 1회 호출된다", async () => {
    const onToggleSidebar = vi.fn();
    const user = userEvent.setup();
    renderRail({ onToggleSidebar });

    const toggle = screen.getByRole("button", { name: "사이드바 접기" });
    await user.click(toggle);

    expect(onToggleSidebar).toHaveBeenCalledTimes(1);
  });
});

describe("IconRail — 접힘 스트립 모드 (계약 §3)", () => {
  test("collapsed면 '사이드바 펼치기' 버튼만 남고 나머지 레일 요소는 렌더되지 않는다", () => {
    renderRail({ collapsed: true, onToggleSidebar: vi.fn() });

    expect(
      screen.getByRole("button", { name: "사이드바 펼치기" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "홈" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "새 글" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "마이 페이지" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTitle("경현의 워크스페이스")
    ).not.toBeInTheDocument();
  });

  test("collapsed에서 '사이드바 펼치기' 클릭 시 콜백이 호출된다", async () => {
    const onToggleSidebar = vi.fn();
    const user = userEvent.setup();
    renderRail({ collapsed: true, onToggleSidebar });

    await user.click(
      screen.getByRole("button", { name: "사이드바 펼치기" })
    );

    expect(onToggleSidebar).toHaveBeenCalledTimes(1);
  });
});
