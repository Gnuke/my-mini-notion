// lib/pages.ts 계약 테스트 (contracts/page-store.md §2, data-model.md §3).
// 모킹은 Supabase 클라이언트 경계 1곳만 — research.md R5.
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Mock } from "vitest";
import {
  OK,
  callsOf,
  createSupabaseMock,
  pageRow,
  type RecordedCall,
  type MockResponse,
} from "@/test/supabase-mock";
import { getSupabase } from "@/lib/supabase/client";
import {
  createPage,
  deletePage,
  fetchPages,
  mapRow,
  updatePage,
} from "@/lib/pages";

vi.mock("@/lib/supabase/client", () => ({ getSupabase: vi.fn() }));

function install(
  respond?: (call: RecordedCall) => MockResponse | Promise<MockResponse> | undefined
) {
  const mock = createSupabaseMock({ respond });
  (getSupabase as Mock).mockReturnValue(mock.client);
  return mock;
}

beforeEach(() => {
  vi.mocked(getSupabase).mockReset();
});

describe("mapRow — page row를 Post로 매핑", () => {
  test("content가 null이면 body는 빈 문자열이다", () => {
    const row = pageRow({ content: null });
    expect(mapRow(row).body).toBe("");
  });

  test("created_at을 epoch ms로 변환하고 나머지 필드를 그대로 옮긴다", () => {
    const row = pageRow({
      id: "p-9",
      title: "제목",
      content: "본문",
      created_at: "2026-07-10T09:00:00.000Z",
    });
    const post = mapRow(row);
    expect(post).toEqual({
      id: "p-9",
      title: "제목",
      body: "본문",
      created: Date.parse("2026-07-10T09:00:00.000Z"),
    });
  });
});

describe("fetchPages — 내 글 목록 조회", () => {
  test("created_at 내림차순으로 조회하고 user_id 클라이언트 필터를 추가하지 않는다", async () => {
    const rows = [pageRow({ id: "b" }), pageRow({ id: "a" })];
    const mock = install(() => ({ ...OK, data: rows }));

    const posts = await fetchPages();

    expect(posts.map((p) => p.id)).toEqual(["b", "a"]);
    const call = mock.calls[0];
    expect(call.table).toBe("page");
    expect(call.steps).toContainEqual(["select", ["*"]]);
    expect(call.steps).toContainEqual([
      "order",
      ["created_at", { ascending: false }],
    ]);
    expect(call.steps.map(([m]) => m)).not.toContain("eq");
  });

  test("오류 응답이면 예외를 던진다", async () => {
    install(() => ({ ...OK, data: null, error: { message: "boom" } }));
    await expect(fetchPages()).rejects.toThrow(/boom/);
  });
});

describe("createPage — 새 글 등록", () => {
  test("빈 제목·빈 본문·세션 사용자 id로 삽입하고 생성된 row를 Post로 반환한다", async () => {
    const created = pageRow({
      id: "new-1",
      title: "",
      content: "",
      user_id: "u-9",
      created_at: "2026-07-16T00:00:00.000Z",
    });
    const mock = install(() => ({ ...OK, data: created }));

    const post = await createPage("u-9");

    const call = callsOf(mock.calls, "insert")[0];
    expect(call.table).toBe("page");
    expect(call.steps[0]).toEqual([
      "insert",
      [{ title: "", content: "", user_id: "u-9" }],
    ]);
    expect(call.steps.map(([m]) => m)).toContain("select");
    expect(call.steps.map(([m]) => m)).toContain("single");
    expect(post).toEqual({
      id: "new-1",
      title: "",
      body: "",
      created: Date.parse("2026-07-16T00:00:00.000Z"),
    });
  });

  test("오류 응답이면 예외를 던진다", async () => {
    install(() => ({ ...OK, data: null, error: { message: "denied" } }));
    await expect(createPage("u-9")).rejects.toThrow(/denied/);
  });
});

describe("updatePage — 글 수정", () => {
  test("body를 content로 매핑해 해당 id 행만 갱신한다", async () => {
    const mock = install(() => OK);

    await updatePage("p-1", { title: "새 제목", body: "새 본문" });

    const call = callsOf(mock.calls, "update")[0];
    expect(call.table).toBe("page");
    expect(call.steps[0]).toEqual([
      "update",
      [{ title: "새 제목", content: "새 본문" }],
    ]);
    expect(call.steps).toContainEqual(["eq", ["id", "p-1"]]);
  });

  test("변경된 필드만 전송한다 (본문만 수정)", async () => {
    const mock = install(() => OK);

    await updatePage("p-1", { body: "본문만" });

    const call = callsOf(mock.calls, "update")[0];
    expect(call.steps[0]).toEqual(["update", [{ content: "본문만" }]]);
  });

  test("오류 응답이면 예외를 던진다", async () => {
    install(() => ({ ...OK, data: null, error: { message: "offline" } }));
    await expect(updatePage("p-1", { title: "t" })).rejects.toThrow(/offline/);
  });
});

describe("deletePage — 글 삭제", () => {
  test("해당 id 행을 삭제한다", async () => {
    const mock = install(() => OK);

    await deletePage("p-1");

    const call = callsOf(mock.calls, "delete")[0];
    expect(call.table).toBe("page");
    expect(call.steps).toContainEqual(["eq", ["id", "p-1"]]);
  });

  test("오류 응답이면 예외를 던진다", async () => {
    install(() => ({ ...OK, data: null, error: { message: "offline" } }));
    await expect(deletePage("p-1")).rejects.toThrow(/offline/);
  });
});
