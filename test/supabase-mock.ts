// 테스트 전용 Supabase 모의 클라이언트 (research.md R5).
// 실제 supabase-js의 체이닝 빌더(from → select/insert/update/delete → eq/order/
// single)와 응답 구조({ data, error, count, status, statusText }) 전체를
// 재현한다 — 부분 모킹 금지(헌법 원칙 I).
import type { SupabaseClient } from "@supabase/supabase-js";

export interface RecordedCall {
  table: string;
  steps: Array<[method: string, args: unknown[]]>;
}

export interface MockResponse {
  data: unknown;
  error: { message: string; code?: string; details?: string } | null;
  count?: number | null;
  status?: number;
  statusText?: string;
}

export const OK: MockResponse = {
  data: null,
  error: null,
  count: null,
  status: 200,
  statusText: "OK",
};

export interface MockUser {
  id: string;
  email?: string;
  aud?: string;
}

export interface PageRowShape {
  id: string;
  title: string;
  content: string | null;
  created_at: string;
  user_id: string;
}

/** page 테이블 실제 row 형태의 테스트 데이터. */
export function pageRow(overrides: Partial<PageRowShape> = {}): PageRowShape {
  return {
    id: "row-1",
    title: "",
    content: "",
    created_at: new Date().toISOString(),
    user_id: "user-1",
    ...overrides,
  };
}

/**
 * respond가 undefined를 반환하면 기본 성공 응답(OK)을 사용한다.
 * user를 명시하지 않으면 로그인된 세션 사용자(user-1)가 존재하는 것으로
 * 동작하고, null을 넘기면 비로그인 세션을 재현한다.
 */
export function createSupabaseMock(
  options: {
    user?: MockUser | null;
    respond?: (
      call: RecordedCall
    ) => MockResponse | Promise<MockResponse> | undefined;
  } = {}
) {
  const calls: RecordedCall[] = [];
  const user =
    options.user === undefined
      ? { id: "user-1", email: "user@example.com", aud: "authenticated" }
      : options.user;

  function makeBuilder(table: string) {
    const call: RecordedCall = { table, steps: [] };
    calls.push(call);
    const builder: Record<string, unknown> = {};
    for (const m of [
      "select",
      "insert",
      "update",
      "delete",
      "eq",
      "order",
      "single",
      "limit",
    ]) {
      builder[m] = (...args: unknown[]) => {
        call.steps.push([m, args]);
        return builder;
      };
    }
    (builder as { then?: unknown }).then = (
      onFulfilled: (v: MockResponse) => unknown,
      onRejected?: (e: unknown) => unknown
    ) => {
      const res = options.respond?.(call) ?? OK;
      return Promise.resolve(res).then(onFulfilled, onRejected);
    };
    return builder;
  }

  const client = {
    from: (table: string) => makeBuilder(table),
    auth: {
      getUser: async () => ({
        data: {
          user: user
            ? {
                aud: "authenticated",
                email: "user@example.com",
                created_at: new Date().toISOString(),
                ...user,
              }
            : null,
        },
        error: null,
      }),
    },
  } as unknown as SupabaseClient;

  return { client, calls };
}

/** 기록된 호출 중 첫 단계가 op인 것들 (예: "update", "insert"). */
export function callsOf(calls: RecordedCall[], op: string): RecordedCall[] {
  return calls.filter((c) => c.steps[0]?.[0] === op);
}
