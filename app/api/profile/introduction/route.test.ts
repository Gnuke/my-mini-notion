// @vitest-environment node
// GET/PUT /api/profile/introduction 계약 테스트 (contracts/introduction-api.md)
// supabase-js는 실제 코드로 실행하고, 네트워크 경계(global fetch)만
// PostgREST 실제 응답 구조로 스텁한다.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { GET, PUT, dynamic } from "@/app/api/profile/introduction/route";

const PG_HEADERS = { "Content-Type": "application/json" };

function pgRows(rows: unknown[]): Response {
  return new Response(JSON.stringify(rows), { status: 200, headers: PG_HEADERS });
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
  return new Request("http://localhost/api/profile/introduction", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test-project.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("캐시 무효화 — Next.js 데이터 캐시가 stale 값을 돌려주지 않아야 한다", () => {
  test("라우트는 force-dynamic으로 선언된다", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  test("GET의 DB 조회 fetch는 cache: no-store로 호출된다", async () => {
    const calls = stubPostgrest([
      pgRows([{ id: "row-1", introduction: "값" }]),
    ]);

    await GET();

    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0].init?.cache).toBe("no-store");
  });

  test("PUT의 DB 조회·갱신 fetch도 cache: no-store로 호출된다", async () => {
    const calls = stubPostgrest([pgRows([{ id: "row-1" }]), pgNoContent()]);

    await PUT(putRequest(JSON.stringify({ introduction: "값" })));

    expect(calls).toHaveLength(2);
    expect(calls[0].init?.cache).toBe("no-store");
    expect(calls[1].init?.cache).toBe("no-store");
  });
});

describe("GET /api/profile/introduction", () => {
  test("등록된 자기소개가 있으면 200과 값을 반환한다", async () => {
    stubPostgrest([pgRows([{ id: "row-1", introduction: "기존 소개" }])]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ introduction: "기존 소개" });
  });

  test("introduction이 NULL이면 200과 null을 반환한다", async () => {
    stubPostgrest([pgRows([{ id: "row-1", introduction: null }])]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ introduction: null });
  });

  test("introduction이 공백뿐이면 미등록(null)으로 취급한다", async () => {
    stubPostgrest([pgRows([{ id: "row-1", introduction: "  \n " }])]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ introduction: null });
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
    stubPostgrest([pgRows([{ id: "row-1", introduction: "값" }])]);

    const res = await GET();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "LOAD_FAILED" });
  });
});

describe("PUT /api/profile/introduction", () => {
  test("정상 본문이면 첫 행에 introduction만 갱신하고 200을 반환한다", async () => {
    const calls = stubPostgrest([
      pgRows([{ id: "row-1" }]),
      pgNoContent(),
    ]);

    const res = await PUT(putRequest(JSON.stringify({ introduction: "새 소개" })));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ introduction: "새 소개" });
    // 2번째 호출이 update — 대상 행과 갱신 컬럼 검증
    expect(calls).toHaveLength(2);
    expect(calls[1].url).toContain("id=eq.row-1");
    expect(JSON.parse(String(calls[1].init?.body))).toEqual({
      introduction: "새 소개",
    });
  });

  test("공백만 있는 introduction은 null로 정규화해 저장한다", async () => {
    const calls = stubPostgrest([pgRows([{ id: "row-1" }]), pgNoContent()]);

    const res = await PUT(putRequest(JSON.stringify({ introduction: "  \n " })));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ introduction: null });
    expect(JSON.parse(String(calls[1].init?.body))).toEqual({
      introduction: null,
    });
  });

  test("정확히 500자(조합 이모지 포함)는 저장을 허용한다", async () => {
    stubPostgrest([pgRows([{ id: "row-1" }]), pgNoContent()]);
    const boundary = "가".repeat(499) + "👨‍👩‍👧";

    const res = await PUT(putRequest(JSON.stringify({ introduction: boundary })));

    expect(res.status).toBe(200);
  });

  test("501자면 400 TOO_LONG을 반환하고 DB를 호출하지 않는다", async () => {
    const calls = stubPostgrest([pgRows([{ id: "row-1" }])]);

    const res = await PUT(
      putRequest(JSON.stringify({ introduction: "가".repeat(501) }))
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "TOO_LONG" });
    expect(calls).toHaveLength(0);
  });

  test("JSON이 아니면 400 INVALID_BODY", async () => {
    stubPostgrest([pgRows([{ id: "row-1" }])]);

    const res = await PUT(putRequest("{깨진 본문"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "INVALID_BODY" });
  });

  test("introduction 키가 없으면 400 INVALID_BODY", async () => {
    stubPostgrest([pgRows([{ id: "row-1" }])]);

    const res = await PUT(putRequest(JSON.stringify({})));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "INVALID_BODY" });
  });

  test("introduction이 문자열/null이 아니면 400 INVALID_BODY", async () => {
    stubPostgrest([pgRows([{ id: "row-1" }])]);

    const res = await PUT(putRequest(JSON.stringify({ introduction: 123 })));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "INVALID_BODY" });
  });

  test("profile 행이 없으면 500 PROFILE_NOT_FOUND", async () => {
    stubPostgrest([pgRows([])]);

    const res = await PUT(putRequest(JSON.stringify({ introduction: "값" })));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "PROFILE_NOT_FOUND" });
  });

  test("행 조회 중 DB 오류면 500 SAVE_FAILED", async () => {
    stubPostgrest([pgError()]);

    const res = await PUT(putRequest(JSON.stringify({ introduction: "값" })));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "SAVE_FAILED" });
  });

  test("갱신 중 DB 오류면 500 SAVE_FAILED", async () => {
    stubPostgrest([pgRows([{ id: "row-1" }]), pgError()]);

    const res = await PUT(putRequest(JSON.stringify({ introduction: "값" })));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "SAVE_FAILED" });
  });

  test("환경 변수가 없으면 500 SAVE_FAILED", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    stubPostgrest([pgRows([{ id: "row-1" }]), pgNoContent()]);

    const res = await PUT(putRequest(JSON.stringify({ introduction: "값" })));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "SAVE_FAILED" });
  });
});
