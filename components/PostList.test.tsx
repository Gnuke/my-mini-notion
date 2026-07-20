// PostList UI 계약 테스트 (contracts/page-ui.md §1) — 실제 스토어 사용,
// 모킹은 Supabase 클라이언트 경계 1곳만 (research.md R5).
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Mock } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostList from "@/components/PostList";
import { NookProvider } from "@/lib/store";
import {
  OK,
  createSupabaseMock,
  pageRow,
  type MockResponse,
  type RecordedCall,
} from "@/test/supabase-mock";
import { getSupabase } from "@/lib/supabase/client";

vi.mock("@/lib/supabase/client", () => ({ getSupabase: vi.fn() }));

const D = 86400000;

type Handlers = Partial<
  Record<string, () => MockResponse | Promise<MockResponse> | undefined>
>;

function install(handlers: Handlers) {
  const mock = createSupabaseMock({
    respond: (call: RecordedCall) => {
      const op = String(call.steps[0]?.[0]);
      return handlers[op]?.();
    },
  });
  (getSupabase as Mock).mockReturnValue(mock.client);
  return mock;
}

function renderList() {
  return render(
    <NookProvider>
      <PostList />
    </NookProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(getSupabase).mockReset();
});

describe("PostList — 로딩 상태 (FR-011)", () => {
  test("불러오는 동안 로딩 문구가 보이고 빈 상태 문구는 보이지 않는다", async () => {
    install({ select: () => new Promise<MockResponse>(() => {}) });
    renderList();

    expect(await screen.findByText("불러오는 중…")).toBeInTheDocument();
    expect(screen.queryByText(/아직 글이 없어요/)).not.toBeInTheDocument();
  });

  test("목록이 도착하면 로딩 문구가 사라지고 글이 보인다", async () => {
    install({
      select: () => ({ ...OK, data: [pageRow({ id: "a", title: "첫 글" })] }),
    });
    renderList();

    expect(await screen.findByText("첫 글")).toBeInTheDocument();
    expect(screen.queryByText("불러오는 중…")).not.toBeInTheDocument();
  });
});

describe("PostList — 조회 실패와 재시도 (FR-007)", () => {
  test("조회 실패 시 안내 문구와 다시 시도 버튼이 보이고, 재시도로 복구된다", async () => {
    let failures = 1;
    install({
      select: () =>
        failures-- > 0
          ? { ...OK, data: null, error: { message: "network" } }
          : { ...OK, data: [pageRow({ id: "a", title: "복구된 글" })] },
    });
    renderList();
    const user = userEvent.setup();

    expect(
      await screen.findByText("글을 불러오지 못했어요.")
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText("복구된 글")).toBeInTheDocument();
    expect(
      screen.queryByText("글을 불러오지 못했어요.")
    ).not.toBeInTheDocument();
  });
});

describe("PostList — 새 글 생성 실패 (FR-007)", () => {
  test("등록 실패 시 안내 문구가 표시된다", async () => {
    install({
      select: () => ({ ...OK, data: [] }),
      insert: () => ({ ...OK, data: null, error: { message: "denied" } }),
    });
    renderList();
    const user = userEvent.setup();

    await screen.findByText(/아직 글이 없어요/);
    await user.click(screen.getByRole("button", { name: "＋ 새 글" }));

    expect(
      await screen.findByText("새 글을 만들지 못했어요.")
    ).toBeInTheDocument();
  });
});

describe("PostList — 목록 표시 (FR-009)", () => {
  test("메타 줄은 생성 시각 기준 상대 시간을 표시한다", async () => {
    install({
      select: () => ({
        ...OK,
        data: [
          pageRow({
            id: "a",
            title: "이틀 전 글",
            content: "본문",
            created_at: new Date(Date.now() - 2 * D).toISOString(),
          }),
        ],
      }),
    });
    renderList();

    expect(await screen.findByText(/2일 전/)).toBeInTheDocument();
  });

  test("글이 없으면 로딩이 끝난 뒤 기존 빈 상태 문구가 보인다", async () => {
    install({ select: () => ({ ...OK, data: [] }) });
    renderList();

    expect(await screen.findByText(/아직 글이 없어요/)).toBeInTheDocument();
  });
});
