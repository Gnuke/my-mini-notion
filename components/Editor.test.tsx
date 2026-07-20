// Editor UI 테스트 — 글자 수 배지(001 기능)와 서버 저장 표시·모델 축소
// (002 기능, contracts/page-ui.md §2). 실제 스토어 사용, 모킹은 Supabase
// 클라이언트 경계 1곳만 (research.md R5).
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Editor from "@/components/Editor";
import { NookProvider, useNook } from "@/lib/store";
import {
  OK,
  createSupabaseMock,
  pageRow,
  type MockResponse,
  type PageRowShape,
  type RecordedCall,
} from "@/test/supabase-mock";
import { getSupabase } from "@/lib/supabase/client";

vi.mock("@/lib/supabase/client", () => ({ getSupabase: vi.fn() }));

const BODY_PLACEHOLDER =
  "여기에 입력하거나, 왼쪽에서 '/page'로 새 글을 만드세요…";
const TITLE_PLACEHOLDER = "제목 없음";
const H = 3600000;

type Handlers = Partial<
  Record<string, () => MockResponse | Promise<MockResponse> | undefined>
>;

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

function renderEditor(extra?: React.ReactNode) {
  return render(
    <NookProvider>
      <Editor />
      {extra}
    </NookProvider>
  );
}

function SwitchTo({ id }: { id: string }) {
  const { select } = useNook();
  return <button onClick={() => select(id)}>글 전환: {id}</button>;
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(getSupabase).mockReset();
});

describe("Editor — 글자 수 배지 (001-char-counter 유지)", () => {
  test("본문이 빈 글을 열면 0자를 표시한다", async () => {
    install([pageRow({ id: "p1", content: "" })]);
    renderEditor();

    expect(await screen.findByText("0자")).toBeInTheDocument();
  });

  test("본문에 입력하면 배지가 실시간으로 갱신된다", async () => {
    install([pageRow({ id: "p1", content: "" })]);
    const user = userEvent.setup();
    renderEditor();
    await screen.findByText("0자");

    const body = screen.getByPlaceholderText(BODY_PLACEHOLDER);
    await user.type(body, "안녕하세요");

    expect(await screen.findByText("5자")).toBeInTheDocument();
  });

  test("일부 삭제하면 감소한 글자 수를 표시한다", async () => {
    install([pageRow({ id: "p1", content: "" })]);
    const user = userEvent.setup();
    renderEditor();
    await screen.findByText("0자");

    const body = screen.getByPlaceholderText(BODY_PLACEHOLDER);
    await user.type(body, "안녕하세요");
    expect(await screen.findByText("5자")).toBeInTheDocument();

    await user.type(body, "{Backspace}{Backspace}");
    expect(await screen.findByText("3자")).toBeInTheDocument();
  });

  test("제목을 입력해도 글자 수는 변하지 않는다", async () => {
    install([pageRow({ id: "p1", content: "안녕하세요", title: "" })]);
    const user = userEvent.setup();
    renderEditor();
    expect(await screen.findByText("5자")).toBeInTheDocument();

    const title = screen.getByPlaceholderText(TITLE_PLACEHOLDER);
    await user.type(title, "새 제목");

    expect(await screen.findByText("5자")).toBeInTheDocument();
  });

  test("다른 글로 전환하면 배지가 새 글의 글자 수로 즉시 바뀐다", async () => {
    install([
      pageRow({ id: "pA", content: "가나다" }),
      pageRow({ id: "pB", content: "" }),
    ]);
    const user = userEvent.setup();
    renderEditor(<SwitchTo id="pB" />);
    expect(await screen.findByText("3자")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "글 전환: pB" }));

    expect(await screen.findByText("0자")).toBeInTheDocument();
  });

  test("선택된 글이 없으면 배지가 렌더되지 않는다", async () => {
    install([]);
    renderEditor();
    await waitFor(() =>
      expect(vi.mocked(getSupabase)).toHaveBeenCalled()
    );

    expect(screen.queryByText(/자$/)).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(BODY_PLACEHOLDER)
    ).not.toBeInTheDocument();
  });
});

describe("Editor — 저장 표시 (FR-012, FR-007)", () => {
  test("저장됨 ✓는 입력 즉시가 아니라 서버 저장 성공 후에 표시된다", async () => {
    install([pageRow({ id: "p1", content: "" })], { update: () => OK });
    const user = userEvent.setup();
    renderEditor();
    await screen.findByText("자동 저장");

    const body = screen.getByPlaceholderText(BODY_PLACEHOLDER);
    await user.type(body, "가");

    // 낙관적 표시 금지 — 서버 응답 전에는 "저장됨 ✓"가 없다.
    expect(screen.queryByText("저장됨 ✓")).not.toBeInTheDocument();

    expect(
      await screen.findByText("저장됨 ✓", {}, { timeout: 3000 })
    ).toBeInTheDocument();
  });

  test("저장 실패 시 '저장 실패'를 표시하고 입력 내용은 화면에 유지된다", async () => {
    install([pageRow({ id: "p1", content: "" })], {
      update: () => ({ ...OK, data: null, error: { message: "offline" } }),
    });
    const user = userEvent.setup();
    renderEditor();
    await screen.findByText("자동 저장");

    const body = screen.getByPlaceholderText(BODY_PLACEHOLDER);
    await user.type(body, "가나다");

    expect(
      await screen.findByText("저장 실패", {}, { timeout: 3000 })
    ).toBeInTheDocument();
    expect(body).toHaveValue("가나다");
    expect(screen.queryByText("저장됨 ✓")).not.toBeInTheDocument();
  });
});

describe("Editor — 모델 축소 반영 (FR-009)", () => {
  test("작성자 메타 줄은 생성 시각 기준 '작성됨'을 표시한다", async () => {
    install([
      pageRow({
        id: "p1",
        content: "",
        created_at: new Date(Date.now() - 2 * H).toISOString(),
      }),
    ]);
    renderEditor();

    expect(
      await screen.findByText(/2시간 전 작성됨/)
    ).toBeInTheDocument();
    expect(screen.queryByText(/편집됨/)).not.toBeInTheDocument();
  });

  test("커버 추가 버튼이 존재하지 않는다", async () => {
    install([pageRow({ id: "p1", content: "" })]);
    renderEditor();
    await screen.findByPlaceholderText(BODY_PLACEHOLDER);

    expect(screen.queryByText(/커버 추가/)).not.toBeInTheDocument();
  });
});

describe("Editor — 삭제 (서버 연동)", () => {
  test("삭제 확정 후 서버 삭제가 성공하면 에디터가 닫힌다", async () => {
    install([pageRow({ id: "p1", content: "" })], { delete: () => OK });
    const user = userEvent.setup();
    renderEditor();
    await screen.findByPlaceholderText(BODY_PLACEHOLDER);

    await user.click(screen.getByRole("button", { name: "삭제" }));
    const confirmButtons = screen.getAllByRole("button", { name: "삭제" });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() =>
      expect(
        screen.queryByPlaceholderText(BODY_PLACEHOLDER)
      ).not.toBeInTheDocument()
    );
  });

  test("서버 삭제가 실패하면 '삭제 실패'를 표시하고 글은 유지된다", async () => {
    install([pageRow({ id: "p1", content: "" })], {
      delete: () => ({ ...OK, data: null, error: { message: "offline" } }),
    });
    const user = userEvent.setup();
    renderEditor();
    await screen.findByPlaceholderText(BODY_PLACEHOLDER);

    await user.click(screen.getByRole("button", { name: "삭제" }));
    const confirmButtons = screen.getAllByRole("button", { name: "삭제" });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    expect(
      await screen.findByText("삭제 실패", {}, { timeout: 3000 })
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(BODY_PLACEHOLDER)
    ).toBeInTheDocument();
  });
});
