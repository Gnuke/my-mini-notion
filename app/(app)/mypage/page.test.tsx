// 마이 페이지 레일 표시(FR-009, 계약 §6) 테스트 — 실제 스토어(NookProvider)
// 사용, next/navigation만 모킹(specs/002 research R7).
import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import MyPage from "@/app/(app)/mypage/page";
import { NookProvider } from "@/lib/store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/mypage",
}));

function renderMyPage() {
  return render(
    <NookProvider>
      <MyPage />
    </NookProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("마이 페이지 — 아이콘 레일 (FR-009)", () => {
  test("아이콘 레일이 항상 표시된다", async () => {
    renderMyPage();

    expect(
      await screen.findByRole("navigation", { name: "주요 탐색" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "마이 페이지" })
    ).toBeInTheDocument();
  });

  test("사이드바 접기/펼치기 토글 버튼이 없다", async () => {
    renderMyPage();
    await screen.findByRole("navigation", { name: "주요 탐색" });

    expect(
      screen.queryByRole("button", { name: "사이드바 접기" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "사이드바 펼치기" })
    ).not.toBeInTheDocument();
  });
});
