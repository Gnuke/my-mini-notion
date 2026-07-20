// @vitest-environment node
// GET/POST /api/profile/image 계약 테스트 (003-profile-image)
// supabase-js는 실제 코드로 실행하고, 네트워크 경계(global fetch)만
// PostgREST/Storage 실제 응답 구조로 스텁한다.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { GET, POST, dynamic } from "@/app/api/profile/image/route";

const PG_HEADERS = { "Content-Type": "application/json" };

// uuidv4 + 선택적 확장자 (예: 0f7c…-….png)
const UUID_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(\.[a-z0-9]+)?$/;

function jsonOk(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: PG_HEADERS,
  });
}

function pgRows(rows: unknown[]): Response {
  return jsonOk(rows);
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

function storageError(): Response {
  return new Response(
    JSON.stringify({ statusCode: "500", error: "Internal", message: "boom" }),
    { status: 500, headers: PG_HEADERS }
  );
}

type FetchCall = { url: string; init?: RequestInit };

/** global fetch를 순서대로 응답하는 스텁으로 교체하고 호출 기록을 돌려준다. */
function stubBackend(responses: Array<Response | (() => Response)>) {
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

function imageFile(name: string, type: string, bytes = 8): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

function postRequest(file?: File): Request {
  const form = new FormData();
  if (file) form.append("file", file);
  return new Request("http://localhost/api/profile/image", {
    method: "POST",
    body: form,
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

  test("POST의 DB·Storage fetch는 모두 cache: no-store로 호출된다", async () => {
    const calls = stubBackend([
      pgRows([{ id: "row-1", image_path: null }]),
      jsonOk({ Key: "profile-image/x" }),
      pgNoContent(),
    ]);

    await POST(postRequest(imageFile("avatar.png", "image/png")));

    expect(calls).toHaveLength(3);
    for (const call of calls) {
      expect(call.init?.cache).toBe("no-store");
    }
  });
});

describe("GET /api/profile/image", () => {
  test("저장된 경로가 있으면 200과 image_path(버킷명 이후 경로)를 반환한다", async () => {
    stubBackend([pgRows([{ id: "row-1", image_path: "old-uuid.png" }])]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ imagePath: "old-uuid.png" });
  });

  test("image_path가 NULL이면 200과 null을 반환한다", async () => {
    stubBackend([pgRows([{ id: "row-1", image_path: null }])]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ imagePath: null });
  });

  test("image_path가 빈 문자열이면 미등록(null)으로 취급한다", async () => {
    stubBackend([pgRows([{ id: "row-1", image_path: "" }])]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ imagePath: null });
  });

  test("profile 행이 없으면 500 PROFILE_NOT_FOUND", async () => {
    stubBackend([pgRows([])]);

    const res = await GET();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "PROFILE_NOT_FOUND" });
  });

  test("DB 오류면 500 LOAD_FAILED", async () => {
    stubBackend([pgError()]);

    const res = await GET();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "LOAD_FAILED" });
  });

  test("환경 변수가 없으면 500 LOAD_FAILED", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    stubBackend([pgRows([{ id: "row-1", image_path: null }])]);

    const res = await GET();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "LOAD_FAILED" });
  });
});

describe("POST /api/profile/image — 업로드 성공", () => {
  test("uuidv4 파일명으로 버킷에 올리고 image_path에 버킷명 이후 경로만 저장한다", async () => {
    const calls = stubBackend([
      pgRows([{ id: "row-1", image_path: null }]),
      jsonOk({ Key: "profile-image/x" }),
      pgNoContent(),
    ]);

    const res = await POST(postRequest(imageFile("avatar.png", "image/png")));

    expect(res.status).toBe(200);
    const { imagePath } = (await res.json()) as { imagePath: string };
    expect(imagePath).toMatch(UUID_NAME);
    expect(imagePath.endsWith(".png")).toBe(true);
    // 버킷명이 경로에 포함되지 않아야 한다 (앞부분은 환경변수 몫)
    expect(imagePath).not.toContain("profile-image");

    // 1) 첫 행 조회 → 2) Storage 업로드 → 3) image_path 갱신
    expect(calls).toHaveLength(3);
    expect(calls[1].url).toContain(
      `/storage/v1/object/profile-image/${imagePath}`
    );
    expect(calls[2].url).toContain("id=eq.row-1");
    expect(JSON.parse(String(calls[2].init?.body))).toEqual({
      image_path: imagePath,
    });
  });

  test("image/jpeg 파일은 .jpg 확장자로 저장한다", async () => {
    stubBackend([
      pgRows([{ id: "row-1", image_path: null }]),
      jsonOk({ Key: "profile-image/x" }),
      pgNoContent(),
    ]);

    const res = await POST(postRequest(imageFile("photo.jpeg", "image/jpeg")));

    const { imagePath } = (await res.json()) as { imagePath: string };
    expect(imagePath.endsWith(".jpg")).toBe(true);
  });

  test("MIME 매핑에 없는 타입은 원본 파일명의 확장자로 폴백한다", async () => {
    stubBackend([
      pgRows([{ id: "row-1", image_path: null }]),
      jsonOk({ Key: "profile-image/x" }),
      pgNoContent(),
    ]);

    const res = await POST(postRequest(imageFile("fav.ico", "image/x-icon")));

    const { imagePath } = (await res.json()) as { imagePath: string };
    expect(imagePath.endsWith(".ico")).toBe(true);
  });

  test("교체 업로드면 저장 성공 후 이전 파일을 삭제한다", async () => {
    const calls = stubBackend([
      pgRows([{ id: "row-1", image_path: "old-uuid.png" }]),
      jsonOk({ Key: "profile-image/x" }),
      pgNoContent(),
      jsonOk([]),
    ]);

    const res = await POST(postRequest(imageFile("avatar.png", "image/png")));

    expect(res.status).toBe(200);
    expect(calls).toHaveLength(4);
    expect(calls[3].init?.method).toBe("DELETE");
    expect(calls[3].url).toContain("/storage/v1/object/profile-image");
    expect(JSON.parse(String(calls[3].init?.body))).toEqual({
      prefixes: ["old-uuid.png"],
    });
  });

  test("이전 파일 삭제가 실패해도 업로드는 성공으로 응답한다", async () => {
    stubBackend([
      pgRows([{ id: "row-1", image_path: "old-uuid.png" }]),
      jsonOk({ Key: "profile-image/x" }),
      pgNoContent(),
      storageError(),
    ]);

    const res = await POST(postRequest(imageFile("avatar.png", "image/png")));

    expect(res.status).toBe(200);
  });
});

describe("POST /api/profile/image — 입력 검증", () => {
  test("file 필드가 없으면 400 INVALID_BODY이고 백엔드를 호출하지 않는다", async () => {
    const calls = stubBackend([pgRows([{ id: "row-1" }])]);

    const res = await POST(postRequest());

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "INVALID_BODY" });
    expect(calls).toHaveLength(0);
  });

  test("이미지가 아닌 파일이면 400 NOT_IMAGE", async () => {
    const calls = stubBackend([pgRows([{ id: "row-1" }])]);

    const res = await POST(postRequest(imageFile("note.txt", "text/plain")));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "NOT_IMAGE" });
    expect(calls).toHaveLength(0);
  });

  test("5MB를 넘는 파일이면 400 TOO_LARGE", async () => {
    const calls = stubBackend([pgRows([{ id: "row-1" }])]);

    const res = await POST(
      postRequest(imageFile("big.png", "image/png", 5 * 1024 * 1024 + 1))
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "TOO_LARGE" });
    expect(calls).toHaveLength(0);
  });
});

describe("POST /api/profile/image — 실패 처리", () => {
  test("profile 행이 없으면 500 PROFILE_NOT_FOUND", async () => {
    const calls = stubBackend([pgRows([])]);

    const res = await POST(postRequest(imageFile("avatar.png", "image/png")));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "PROFILE_NOT_FOUND" });
    expect(calls).toHaveLength(1);
  });

  test("행 조회 중 DB 오류면 500 UPLOAD_FAILED", async () => {
    stubBackend([pgError()]);

    const res = await POST(postRequest(imageFile("avatar.png", "image/png")));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "UPLOAD_FAILED" });
  });

  test("Storage 업로드가 실패하면 500 UPLOAD_FAILED이고 DB를 갱신하지 않는다", async () => {
    const calls = stubBackend([
      pgRows([{ id: "row-1", image_path: null }]),
      storageError(),
    ]);

    const res = await POST(postRequest(imageFile("avatar.png", "image/png")));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "UPLOAD_FAILED" });
    expect(calls).toHaveLength(2);
  });

  test("image_path 갱신이 실패하면 500 SAVE_FAILED이고 올린 파일을 정리한다", async () => {
    const calls = stubBackend([
      pgRows([{ id: "row-1", image_path: null }]),
      jsonOk({ Key: "profile-image/x" }),
      pgError(),
      jsonOk([]),
    ]);

    const res = await POST(postRequest(imageFile("avatar.png", "image/png")));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "SAVE_FAILED" });
    // 4번째 호출이 방금 올린 uuid 파일의 삭제여야 한다
    expect(calls).toHaveLength(4);
    expect(calls[3].init?.method).toBe("DELETE");
    const removed = JSON.parse(String(calls[3].init?.body)) as {
      prefixes: string[];
    };
    expect(removed.prefixes).toHaveLength(1);
    expect(removed.prefixes[0]).toMatch(UUID_NAME);
  });

  test("환경 변수가 없으면 500 UPLOAD_FAILED이고 백엔드를 호출하지 않는다", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const calls = stubBackend([pgRows([{ id: "row-1" }])]);

    const res = await POST(postRequest(imageFile("avatar.png", "image/png")));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "UPLOAD_FAILED" });
    expect(calls).toHaveLength(0);
  });
});
