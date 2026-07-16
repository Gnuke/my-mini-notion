// NookProvider 스토어 계약 테스트 (contracts/page-store.md §3).
// 모킹은 Supabase 클라이언트 경계 1곳만 — 스토어·lib/pages.ts는 실제 코드 사용.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Mock } from "vitest";
import { act, render } from "@testing-library/react";
import { NookProvider, useNook } from "@/lib/store";
import { LS_KEY } from "@/lib/data";
import {
  OK,
  callsOf,
  createSupabaseMock,
  pageRow,
  type MockResponse,
  type RecordedCall,
} from "@/test/supabase-mock";
import { getSupabase } from "@/lib/supabase/client";

vi.mock("@/lib/supabase/client", () => ({ getSupabase: vi.fn() }));

const DEBOUNCE = 600;
const FLASH = 1500;

let store: ReturnType<typeof useNook>;

function Probe() {
  store = useNook();
  return null;
}

type Handlers = Partial<
  Record<string, () => MockResponse | Promise<MockResponse> | undefined>
>;

function install(handlers: Handlers = {}, user?: { id: string } | null) {
  const mock = createSupabaseMock({
    user,
    respond: (call: RecordedCall) => {
      const op = String(call.steps[0]?.[0]);
      return handlers[op]?.();
    },
  });
  (getSupabase as Mock).mockReturnValue(mock.client);
  return mock;
}

function renderStore() {
  return render(
    <NookProvider>
      <Probe />
    </NookProvider>
  );
}

async function flushAsync() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(getSupabase).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("초기 목록 로딩", () => {
  test("목록이 도착하기 전에는 loading이 true다", async () => {
    install({
      select: () => new Promise<MockResponse>(() => {}), // 미해결 — 로딩 지속
    });
    renderStore();
    await flushAsync();

    expect(store.loading).toBe(true);
    expect(store.loadError).toBe(false);
  });

  test("목록 도착 후 loading이 해제되고 첫 글이 자동 선택된다", async () => {
    install({
      select: () => ({
        ...OK,
        data: [pageRow({ id: "b", title: "최신" }), pageRow({ id: "a" })],
      }),
    });
    renderStore();
    await flushAsync();

    expect(store.loading).toBe(false);
    expect(store.posts.map((p) => p.id)).toEqual(["b", "a"]);
    expect(store.selectedId).toBe("b");
    expect(store.active?.title).toBe("최신");
  });

  test("글이 없으면 빈 목록으로 시작하고 시드를 만들지 않는다", async () => {
    const mock = install({ select: () => ({ ...OK, data: [] }) });
    renderStore();
    await flushAsync();

    expect(store.loading).toBe(false);
    expect(store.posts).toEqual([]);
    expect(store.selectedId).toBeNull();
    expect(callsOf(mock.calls, "insert")).toHaveLength(0);
  });

  test("조회 실패 시 loadError가 켜지고 retry로 재시도한다", async () => {
    let failures = 1;
    install({
      select: () =>
        failures-- > 0
          ? { ...OK, data: null, error: { message: "network" } }
          : { ...OK, data: [pageRow({ id: "a", title: "복구" })] },
    });
    renderStore();
    await flushAsync();

    expect(store.loadError).toBe(true);
    expect(store.loading).toBe(false);

    act(() => store.retry());
    await flushAsync();

    expect(store.loadError).toBe(false);
    expect(store.posts.map((p) => p.title)).toEqual(["복구"]);
  });
});

describe("newPost — 서버 등록", () => {
  test("성공 시 목록 맨 앞에 추가되고 선택되며 id를 반환한다", async () => {
    const mock = install({
      select: () => ({ ...OK, data: [pageRow({ id: "old" })] }),
      insert: () => ({ ...OK, data: pageRow({ id: "new-1" }) }),
    });
    renderStore();
    await flushAsync();

    let id: string | null = null;
    await act(async () => {
      id = await store.newPost();
    });

    expect(id).toBe("new-1");
    expect(store.posts[0].id).toBe("new-1");
    expect(store.selectedId).toBe("new-1");
    expect(store.createFailed).toBe(false);
    const insert = callsOf(mock.calls, "insert")[0];
    expect(insert.steps[0][1][0]).toMatchObject({ user_id: "user-1" });
  });

  test("실패 시 글이 생성되지 않고 createFailed가 켜진다", async () => {
    install({
      select: () => ({ ...OK, data: [] }),
      insert: () => ({ ...OK, data: null, error: { message: "denied" } }),
    });
    renderStore();
    await flushAsync();

    let id: string | null = "sentinel";
    await act(async () => {
      id = await store.newPost();
    });

    expect(id).toBeNull();
    expect(store.posts).toEqual([]);
    expect(store.createFailed).toBe(true);
  });
});

describe("patch — 자동 저장 (600ms 디바운스, FR-012)", () => {
  function installEditable(handlers: Handlers = {}) {
    return install({
      select: () => ({ ...OK, data: [pageRow({ id: "p1", title: "" })] }),
      ...handlers,
    });
  }

  test("로컬에는 즉시 반영되고 서버 저장 전에는 saved가 켜지지 않는다", async () => {
    vi.useFakeTimers();
    installEditable();
    renderStore();
    await flushAsync();

    act(() => store.patch({ title: "제목" }));

    expect(store.active?.title).toBe("제목");
    expect(store.saved).toBe(false);
  });

  test("연속 입력은 마지막 입력 후 600ms에 update 1회로 합쳐진다", async () => {
    vi.useFakeTimers();
    const mock = installEditable({ update: () => OK });
    renderStore();
    await flushAsync();

    act(() => store.patch({ title: "ㄱ" }));
    act(() => store.patch({ title: "가" }));
    act(() => store.patch({ body: "본문" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE - 1);
    });
    expect(callsOf(mock.calls, "update")).toHaveLength(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    const updates = callsOf(mock.calls, "update");
    expect(updates).toHaveLength(1);
    expect(updates[0].steps[0]).toEqual([
      "update",
      [{ title: "가", content: "본문" }],
    ]);
    expect(updates[0].steps).toContainEqual(["eq", ["id", "p1"]]);
  });

  test("서버 저장이 성공하면 saved가 켜지고 1.5초 뒤 꺼진다", async () => {
    vi.useFakeTimers();
    installEditable({ update: () => OK });
    renderStore();
    await flushAsync();

    act(() => store.patch({ title: "가" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE);
    });

    expect(store.saved).toBe(true);
    expect(store.saveFailed).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(FLASH);
    });
    expect(store.saved).toBe(false);
  });

  test("저장 실패 시 saveFailed가 켜지고 로컬 내용은 유지된다 (FR-007)", async () => {
    vi.useFakeTimers();
    let fail = true;
    installEditable({
      update: () =>
        fail
          ? { ...OK, data: null, error: { message: "offline" } }
          : OK,
    });
    renderStore();
    await flushAsync();

    act(() => store.patch({ title: "유지될 제목" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE);
    });

    expect(store.saveFailed).toBe("update");
    expect(store.saved).toBe(false);
    expect(store.active?.title).toBe("유지될 제목");

    // 다음 저장이 성공하면 실패 표시가 해제되고, 실패했던 변경도 함께 재전송된다.
    fail = false;
    act(() => store.patch({ body: "이어서" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE);
    });

    expect(store.saveFailed).toBeNull();
    expect(store.saved).toBe(true);
  });

  test("글을 전환하면 보류 중인 변경이 즉시 저장된다 (flush)", async () => {
    vi.useFakeTimers();
    const mock = install({
      select: () => ({
        ...OK,
        data: [pageRow({ id: "p1" }), pageRow({ id: "p2" })],
      }),
      update: () => OK,
    });
    renderStore();
    await flushAsync();

    act(() => store.patch({ title: "전환 전" }));
    act(() => store.select("p2"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const updates = callsOf(mock.calls, "update");
    expect(updates).toHaveLength(1);
    expect(updates[0].steps).toContainEqual(["eq", ["id", "p1"]]);
    expect(store.selectedId).toBe("p2");
  });

  test("언마운트 시 보류 중인 변경이 저장된다 (flush)", async () => {
    vi.useFakeTimers();
    const mock = installEditable({ update: () => OK });
    const view = renderStore();
    await flushAsync();

    act(() => store.patch({ title: "마지막 입력" }));
    view.unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(callsOf(mock.calls, "update")).toHaveLength(1);
  });
});

describe("remove — 서버 삭제", () => {
  test("성공 시 목록에서 제거되고 남은 첫 글이 선택된다", async () => {
    install({
      select: () => ({
        ...OK,
        data: [pageRow({ id: "p1" }), pageRow({ id: "p2" })],
      }),
      delete: () => OK,
    });
    renderStore();
    await flushAsync();

    await act(async () => {
      await store.remove();
    });

    expect(store.posts.map((p) => p.id)).toEqual(["p2"]);
    expect(store.selectedId).toBe("p2");
  });

  test("실패 시 글이 유지되고 saveFailed('delete')가 켜진다", async () => {
    install({
      select: () => ({ ...OK, data: [pageRow({ id: "p1" })] }),
      delete: () => ({ ...OK, data: null, error: { message: "offline" } }),
    });
    renderStore();
    await flushAsync();

    await act(async () => {
      await store.remove();
    });

    expect(store.posts.map((p) => p.id)).toEqual(["p1"]);
    expect(store.saveFailed).toBe("delete");
  });
});

describe("세션 없음 — 비로그인 차단 (US3, FR-001)", () => {
  test("세션 사용자가 없으면 목록을 요청하지 않고 loading만 해제한다", async () => {
    const mock = install(
      { select: () => ({ ...OK, data: [pageRow({ id: "someone" })] }) },
      null // 비로그인 세션
    );
    renderStore();
    await flushAsync();

    expect(store.loading).toBe(false);
    expect(store.loadError).toBe(false);
    expect(store.posts).toEqual([]);
    // 데이터 요청 자체가 없어야 한다 — 화면 이동은 기존 가드가 담당.
    expect(callsOf(mock.calls, "select")).toHaveLength(0);
  });
});

describe("localStorage — 글 데이터 비영속 (FR-006)", () => {
  test("글·선택 상태는 localStorage에 기록되지 않는다 (프로필만 유지)", async () => {
    install({
      select: () => ({ ...OK, data: [pageRow({ id: "p1" })] }),
      update: () => OK,
    });
    renderStore();
    await flushAsync();

    act(() => store.patch({ title: "저장되면 안 되는 제목" }));
    await flushAsync();

    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    expect(parsed).not.toHaveProperty("posts");
    expect(parsed).not.toHaveProperty("selectedId");
  });
});
