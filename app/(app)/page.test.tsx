// 업무 화면 사이드바 접기/펼치기(US1)·작업 연속성(US2) 테스트 — 실제
// 스토어(NookProvider) 사용, 모킹은 Supabase 클라이언트 경계 1곳 +
// next/navigation(jsdom에 App Router 런타임이 없어 불가피 — specs/002 research R7).
import { describe, expect, test, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WorkspacePage from "@/app/(app)/page";
import { NookProvider } from "@/lib/store";
import {
  OK,
  createSupabaseMock,
  pageRow,
  type MockResponse,
  type PageRowShape,
  type RecordedCall,
} from "@/test/supabase-mock";
import { getSupabase } from "@/lib/supabase/client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("@/lib/supabase/client", () => ({ getSupabase: vi.fn() }));

type Handlers = Partial<
  Record<string, () => MockResponse | Promise<MockResponse> | undefined>
>;

/** 서버(page 테이블)에 rows가 저장돼 있는 상태를 재현한다. */
function install(rows: PageRowShape[], handlers: Handlers = {}) {
  const mock = createSupabaseMock({
    respond: (call: RecordedCall) => {
      const op = String(call.steps[0]?.[0]);
      if (handlers[op]) return handlers[op]!();
      if (op === "select") return { ...OK, data: rows };
      return OK;
    },
  });
  (getSupabase as Mock).mockReturnValue(mock.client);
  return mock;
}

function renderPage() {
  return render(
    <NookProvider>
      <WorkspacePage />
    </NookProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(getSupabase).mockReset();
});

describe("업무 화면 — 사이드바 접기/펼치기 (US1)", () => {
  test("처음 진입하면 사이드바가 펼쳐져 있고 '사이드바 접기' 버튼이 보인다 (FR-008)", async () => {
    install([pageRow({ id: "p1", title: "첫 글" })]);
    renderPage();

    expect(await screen.findByText("첫 글")).toBeVisible();
    expect(screen.getByText("내 글")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "사이드바 접기" })
    ).toBeVisible();
  });

  test("접기 버튼을 클릭하면 글 목록이 숨고 '사이드바 펼치기' 버튼이 보인다", async () => {
    install([pageRow({ id: "p1" })]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("내 글");

    await user.click(screen.getByRole("button", { name: "사이드바 접기" }));

    expect(screen.getByText("내 글")).not.toBeVisible();
    expect(
      screen.getByRole("button", { name: "사이드바 펼치기" })
    ).toBeVisible();
  });

  test("펼치기 버튼을 다시 클릭하면 글 목록이 원래대로 보인다", async () => {
    install([pageRow({ id: "p1" })]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("내 글");

    await user.click(screen.getByRole("button", { name: "사이드바 접기" }));
    await user.click(screen.getByRole("button", { name: "사이드바 펼치기" }));

    expect(screen.getByText("내 글")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "사이드바 접기" })
    ).toBeVisible();
  });

  test("토글을 5회 연타하면 마지막 클릭 기준(접힘) 상태가 된다", async () => {
    install([pageRow({ id: "p1" })]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("내 글");

    for (let i = 0; i < 5; i++) {
      const name = i % 2 === 0 ? "사이드바 접기" : "사이드바 펼치기";
      await user.click(screen.getByRole("button", { name }));
    }

    expect(screen.getByText("내 글")).not.toBeVisible();
    expect(
      screen.getByRole("button", { name: "사이드바 펼치기" })
    ).toBeVisible();
  });
});

describe("업무 화면 — 접힌 상태에서도 작업 연속성 유지 (US2)", () => {
  test("검색어를 입력하고 접었다 펼쳐도 검색어와 필터 결과가 유지된다 (FR-005)", async () => {
    install([
      pageRow({ id: "pA", title: "미니 노션 PRD 정리" }),
      pageRow({ id: "pB", title: "회의 메모" }),
    ]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("미니 노션 PRD 정리");

    await user.type(screen.getByPlaceholderText("검색…"), "PRD");
    expect(screen.queryByText("회의 메모")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "사이드바 접기" }));
    await user.click(screen.getByRole("button", { name: "사이드바 펼치기" }));

    expect(screen.getByPlaceholderText("검색…")).toHaveValue("PRD");
    expect(screen.getByText("미니 노션 PRD 정리")).toBeVisible();
    expect(screen.queryByText("회의 메모")).not.toBeInTheDocument();
  });

  test("접힌 상태에서도 본문 편집과 자동 저장이 동작한다 (FR-006)", async () => {
    install([pageRow({ id: "p1", content: "" })], { update: () => OK });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("내 글");

    await user.click(screen.getByRole("button", { name: "사이드바 접기" }));
    const body = screen.getByPlaceholderText(
      "여기에 입력하거나, 왼쪽에서 '/page'로 새 글을 만드세요…"
    );
    await user.type(body, "안녕");

    expect(body).toHaveValue("안녕");
    expect(
      await screen.findByText("저장됨 ✓", {}, { timeout: 3000 })
    ).toBeVisible();
  });

  test("접힌 상태에서는 사이드바 소속 기능이 노출되지 않는다", async () => {
    install([pageRow({ id: "p1" })]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("내 글");

    await user.click(screen.getByRole("button", { name: "사이드바 접기" }));

    expect(screen.getByText("내 글")).not.toBeVisible();
    expect(screen.getByPlaceholderText("검색…")).not.toBeVisible();
    expect(
      screen.getByPlaceholderText("'/page' 입력 후 Enter")
    ).not.toBeVisible();
    expect(
      screen.queryByRole("button", { name: "홈" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "새 글" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "마이 페이지" })
    ).not.toBeInTheDocument();
  });

  test("[Edge] 접힌 상태에서 글을 삭제하면 빈 상태가 표시되고 접힘은 유지된다", async () => {
    install([pageRow({ id: "p1", title: "유일한 글" })], {
      delete: () => OK,
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("내 글");

    await user.click(screen.getByRole("button", { name: "사이드바 접기" }));
    await user.click(screen.getByRole("button", { name: "삭제" }));
    const confirmButtons = screen.getAllByRole("button", { name: "삭제" });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    expect(await screen.findByText("열려 있는 글이 없어요")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "사이드바 펼치기" })
    ).toBeVisible();
    expect(screen.getByText("내 글")).not.toBeVisible();
  });
});
