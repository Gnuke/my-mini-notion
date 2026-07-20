// @vitest-environment node
// GET/PUT /api/profile 계약 테스트 (004-profile-db)
// supabase-js는 실제 코드로 실행하고, 네트워크 경계(global fetch)만
// PostgREST 실제 응답 구조로 스텁한다. 세션 확인은 서버 클라이언트 모듈만 모킹.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { GET, PUT, dynamic } from "@/app/api/profile/route";

const session = vi.hoisted(() => ({ userId: "user-1" as string | null }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: {
      getUser: async () => ({
        data: { user: session.userId ? { id: session.userId } : null },
        error: null,
      }),
    },
  }),
}));

const PG_HEADERS = { "Content-Type": "application/json" };

function pgRows(rows: unknown[]): Response {
  return new Response(JSON.stringify(rows), {
    status: 200,
    headers: PG_HEADERS,
  });
}

function pgError(): Response {
  return new Response(
    JSON.stringify({
      message: "connection failure",
      code: "XX000",
      details: null,
      hint: null,
    }),
    { status: 500, headers: PG_HEADERS }
  );
}

function pgNoContent(): Response {
  return new Response(null, { status: 204 });
}

type FetchCall = { url: string; init?: RequestInit };

/** global fetch를 순서대로 응답하는 스텁으로 교체하고 호출 기록을 돌려준다. */
function stubPostgrest(responses: Array<Response | (() => Response)>) {
  const calls: FetchCall[] = [];
  let i = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      calls.push({ url, init });
      const next = responses[Math.min(i, responses.length - 1)];
      i += 1;
      return typeof next === "function" ? next() : next;
    })
  );
  return calls;
}

function putRequest(body: string): Request {
  return new Request("http://localhost/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

beforeEach(() => {
  session.userId = "user-1";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test-project.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("캐시 무효화", () => {
  test("라우트는 force-dynamic으로 선언된다", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  test("GET의 DB 조회 fetch는 cache: no-store로 호출된다", async () => {
    const calls = stubPostgrest([
      pgRows([{ id: "row-1", name: "별명", image_path: null }]),
    ]);

    await GET();

    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0].init?.cache).toBe("no-store");
  });
});

describe("세션 없음 — 미로그인 차단", () => {
  test("GET은 세션이 없으면 401이고 DB를 호출하지 않는다", async () => {
    session.userId = null;
    const calls = stubPostgrest([pgRows([{ id: "row-1" }])]);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "UNAUTHORIZED" });
    expect(calls).toHaveLength(0);
  });

  test("PUT은 세션이 없으면 401이고 DB를 호출하지 않는다", async () => {
    session.userId = null;
    const calls = stubPostgrest([pgRows([{ id: "row-1" }])]);

    const res = await PUT(putRequest(JSON.stringify({ name: "별명" })));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "UNAUTHORIZED" });
    expect(calls).toHaveLength(0);
  });
});

describe("GET /api/profile", () => {
  test("본인(user_id) 행의 별명·이미지 경로를 반환한다", async () => {
    const calls = stubPostgrest([
      pgRows([{ id: "row-1", name: "저장 별명", image_path: "abc.png" }]),
    ]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      name: "저장 별명",
      imagePath: "abc.png",
    });
    expect(calls[0].url).toContain("user_id=eq.user-1");
  });

  test("별명이 NULL·공백이면 null로, 이미지 경로가 없으면 null로 정규화한다", async () => {
    stubPostgrest([pgRows([{ id: "row-1", name: "  ", image_path: null }])]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ name: null, imagePath: null });
  });

  test("profile 행이 없으면 500 PROFILE_NOT_FOUND", async () => {
    stubPostgrest([pgRows([])]);

    const res = await GET();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "PROFILE_NOT_FOUND" });
  });

  test("DB 오류면 500 LOAD_FAILED", async () => {
    stubPostgrest([pgError()]);

    const res = await GET();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "LOAD_FAILED" });
  });

  test("환경 변수가 없으면 500 LOAD_FAILED", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    stubPostgrest([pgRows([{ id: "row-1", name: "값", image_path: null }])]);

    const res = await GET();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "LOAD_FAILED" });
  });
});

describe("PUT /api/profile — 별명 저장", () => {
  test("본인 행의 name만 갱신하고 저장된 값을 반환한다", async () => {
    const calls = stubPostgrest([pgRows([{ id: "row-1" }]), pgNoContent()]);

    const res = await PUT(putRequest(JSON.stringify({ name: "새 별명" })));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ name: "새 별명" });
    expect(calls).toHaveLength(2);
    expect(calls[0].url).toContain("user_id=eq.user-1");
    expect(calls[1].url).toContain("id=eq.row-1");
    expect(JSON.parse(String(calls[1].init?.body))).toEqual({
      name: "새 별명",
    });
  });

  test("앞뒤 공백은 제거해 저장한다", async () => {
    const calls = stubPostgrest([pgRows([{ id: "row-1" }]), pgNoContent()]);

    const res = await PUT(putRequest(JSON.stringify({ name: "  별명  " })));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ name: "별명" });
    expect(JSON.parse(String(calls[1].init?.body))).toEqual({ name: "별명" });
  });

  test("공백뿐인 별명은 400 EMPTY_NAME이고 DB를 호출하지 않는다", async () => {
    const calls = stubPostgrest([pgRows([{ id: "row-1" }])]);

    const res = await PUT(putRequest(JSON.stringify({ name: "   " })));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "EMPTY_NAME" });
    expect(calls).toHaveLength(0);
  });

  test("JSON이 아니면 400 INVALID_BODY", async () => {
    stubPostgrest([pgRows([{ id: "row-1" }])]);

    const res = await PUT(putRequest("{깨진 본문"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "INVALID_BODY" });
  });

  test("name 키가 없거나 문자열이 아니면 400 INVALID_BODY", async () => {
    stubPostgrest([pgRows([{ id: "row-1" }])]);

    expect((await PUT(putRequest(JSON.stringify({})))).status).toBe(400);
    expect(
      (await PUT(putRequest(JSON.stringify({ name: 123 })))).status
    ).toBe(400);
    expect(
      (await PUT(putRequest(JSON.stringify({ name: null })))).status
    ).toBe(400);
  });

  test("profile 행이 없으면 500 PROFILE_NOT_FOUND", async () => {
    stubPostgrest([pgRows([])]);

    const res = await PUT(putRequest(JSON.stringify({ name: "값" })));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "PROFILE_NOT_FOUND" });
  });

  test("행 조회·갱신 중 DB 오류면 500 SAVE_FAILED", async () => {
    stubPostgrest([pgError()]);
    expect(
      (await PUT(putRequest(JSON.stringify({ name: "값" })))).status
    ).toBe(500);

    stubPostgrest([pgRows([{ id: "row-1" }]), pgError()]);
    const res = await PUT(putRequest(JSON.stringify({ name: "값" })));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "SAVE_FAILED" });
  });

  test("환경 변수가 없으면 500 SAVE_FAILED", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    stubPostgrest([pgRows([{ id: "row-1" }]), pgNoContent()]);

    const res = await PUT(putRequest(JSON.stringify({ name: "값" })));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "SAVE_FAILED" });
  });
});
