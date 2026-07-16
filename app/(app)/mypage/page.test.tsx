// 마이페이지 자기소개 UI 계약 테스트 (contracts/mypage-introduction-ui.md)
// 실제 스토어(NookProvider) 사용 — 모킹은 /api 네트워크 경계(global fetch)만.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MyPage from "@/app/(app)/mypage/page";
import { NookProvider } from "@/lib/store";
import { DEFAULT_PROFILE, LS_KEY } from "@/lib/data";

const INTRO_PLACEHOLDER = "자신을 소개하는 글을 남겨보세요";
const SAVE_BUTTON = "변경 사항 저장";
const SAVED_FLASH = "저장되었습니다 ✓";

type MockJson = { introduction?: string | null; error?: string };

function jsonResponse(ok: boolean, body: MockJson) {
  return { ok, json: async () => body };
}

/** GET/PUT 응답을 지정해 global fetch를 스텁하고 mock을 돌려준다. */
function stubApi(options: {
  get?: { ok: boolean; body: MockJson } | (() => Promise<never>);
  put?: { ok: boolean; body: MockJson };
}) {
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === "PUT") {
      const put = options.put ?? { ok: true, body: { introduction: null } };
      return jsonResponse(put.ok, put.body);
    }
    const get = options.get ?? { ok: true, body: { introduction: null } };
    if (typeof get === "function") return get();
    return jsonResponse(get.ok, get.body);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderMyPage() {
  return render(
    <NookProvider>
      <MyPage />
    </NookProvider>
  );
}

function putCallBody(fetchMock: ReturnType<typeof vi.fn>): unknown {
  const call = fetchMock.mock.calls.find(
    (args) => (args[1] as RequestInit | undefined)?.method === "PUT"
  );
  expect(call).toBeTruthy();
  return JSON.parse(String((call![1] as RequestInit).body));
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(
    LS_KEY,
    JSON.stringify({ posts: [], selectedId: null, profile: DEFAULT_PROFILE })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("마이페이지 자기소개 — 로딩 게이트 (US1)", () => {
  test("자기소개를 불러오기 전에는 폼을 표시하지 않고, 불러온 뒤 표시한다", async () => {
    let resolveGet!: (value: {
      ok: boolean;
      json: () => Promise<MockJson>;
    }) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise((resolve) => (resolveGet = resolve)))
    );

    renderMyPage();

    // GET settle 전 — 별명 입력을 포함한 폼 전체가 없어야 한다
    expect(screen.queryByPlaceholderText("별명")).not.toBeInTheDocument();

    resolveGet(jsonResponse(true, { introduction: null }));

    expect(await screen.findByPlaceholderText("별명")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(INTRO_PLACEHOLDER)
    ).toBeInTheDocument();
  });
});

describe("마이페이지 자기소개 — 등록과 확인 (US1)", () => {
  test("미등록이면 입력을 유도하는 placeholder를 표시한다", async () => {
    stubApi({ get: { ok: true, body: { introduction: null } } });

    renderMyPage();

    const textarea = await screen.findByPlaceholderText(INTRO_PLACEHOLDER);
    expect(textarea).toHaveValue("");
  });

  test("입력 후 저장하면 PUT 요청을 보내고 저장 확인 표시가 나타난다", async () => {
    const fetchMock = stubApi({
      get: { ok: true, body: { introduction: null } },
      put: { ok: true, body: { introduction: "안녕하세요" } },
    });
    const user = userEvent.setup();

    renderMyPage();
    const textarea = await screen.findByPlaceholderText(INTRO_PLACEHOLDER);
    await user.type(textarea, "안녕하세요");
    await user.click(screen.getByRole("button", { name: SAVE_BUTTON }));

    expect(await screen.findByText(SAVED_FLASH)).toBeInTheDocument();
    expect(putCallBody(fetchMock)).toEqual({ introduction: "안녕하세요" });
  });

  test("저장된 자기소개가 있으면 줄바꿈을 보존해 표시한다", async () => {
    stubApi({
      get: { ok: true, body: { introduction: "첫 줄\n둘째 줄" } },
    });

    renderMyPage();

    const textarea = await screen.findByPlaceholderText(INTRO_PLACEHOLDER);
    expect(textarea).toHaveValue("첫 줄\n둘째 줄");
  });
});

describe("마이페이지 자기소개 — 수정 (US2)", () => {
  test("기존 자기소개를 고쳐 저장하면 수정본으로 PUT 요청을 보낸다", async () => {
    const fetchMock = stubApi({
      get: { ok: true, body: { introduction: "첫 소개" } },
      put: { ok: true, body: { introduction: "고친 소개" } },
    });
    const user = userEvent.setup();

    renderMyPage();
    const textarea = await screen.findByPlaceholderText(INTRO_PLACEHOLDER);
    await user.clear(textarea);
    await user.type(textarea, "고친 소개");
    await user.click(screen.getByRole("button", { name: SAVE_BUTTON }));

    expect(await screen.findByText(SAVED_FLASH)).toBeInTheDocument();
    expect(putCallBody(fetchMock)).toEqual({ introduction: "고친 소개" });
  });

  test("내용을 모두 지우고 저장하면 null을 전송하고 미등록 상태로 돌아간다", async () => {
    const fetchMock = stubApi({
      get: { ok: true, body: { introduction: "기존 소개" } },
      put: { ok: true, body: { introduction: null } },
    });
    const user = userEvent.setup();

    renderMyPage();
    const textarea = await screen.findByPlaceholderText(INTRO_PLACEHOLDER);
    await user.clear(textarea);
    await user.click(screen.getByRole("button", { name: SAVE_BUTTON }));

    expect(await screen.findByText(SAVED_FLASH)).toBeInTheDocument();
    expect(putCallBody(fetchMock)).toEqual({ introduction: null });
    expect(textarea).toHaveValue("");
  });
});

describe("마이페이지 자기소개 — 500자 카운터·한도 (US2)", () => {
  test("입력에 따라 카운터가 갱신되고 조합 이모지는 1자로 센다", async () => {
    stubApi({ get: { ok: true, body: { introduction: null } } });
    const user = userEvent.setup();

    renderMyPage();
    const textarea = await screen.findByPlaceholderText(INTRO_PLACEHOLDER);
    expect(screen.getByText("0/500자")).toBeInTheDocument();

    await user.type(textarea, "안녕");
    expect(screen.getByText("2/500자")).toBeInTheDocument();

    await user.type(textarea, "👨‍👩‍👧");
    expect(screen.getByText("3/500자")).toBeInTheDocument();
  });

  test("500자에 도달하면 추가 입력을 무시한다", async () => {
    const full = "가".repeat(500);
    stubApi({ get: { ok: true, body: { introduction: full } } });
    const user = userEvent.setup();

    renderMyPage();
    const textarea = await screen.findByPlaceholderText(INTRO_PLACEHOLDER);
    expect(screen.getByText("500/500자")).toBeInTheDocument();

    await user.type(textarea, "나");

    expect(textarea).toHaveValue(full);
    expect(screen.getByText("500/500자")).toBeInTheDocument();
  });

  test("500자 초과 저장본은 전체를 표시하고 카운터를 위험 색으로 강조한다", async () => {
    const legacy = "가".repeat(600);
    stubApi({ get: { ok: true, body: { introduction: legacy } } });

    renderMyPage();

    const textarea = await screen.findByPlaceholderText(INTRO_PLACEHOLDER);
    expect(textarea).toHaveValue(legacy);
    const counter = screen.getByText("600/500자");
    expect(counter.style.color).toBe("var(--text-danger)");
  });

  test("500자 초과 상태에서도 짧아지는 편집은 허용한다", async () => {
    const legacy = "가".repeat(600);
    stubApi({ get: { ok: true, body: { introduction: legacy } } });
    const user = userEvent.setup();

    renderMyPage();
    const textarea = await screen.findByPlaceholderText(INTRO_PLACEHOLDER);
    await user.type(textarea, "{Backspace}");

    expect(textarea).toHaveValue("가".repeat(599));
    expect(screen.getByText("599/500자")).toBeInTheDocument();
  });

  test("500자 초과 상태로 저장하면 요청 없이 한국어 안내를 표시한다", async () => {
    const legacy = "가".repeat(600);
    const fetchMock = stubApi({
      get: { ok: true, body: { introduction: legacy } },
    });
    const user = userEvent.setup();

    renderMyPage();
    await screen.findByPlaceholderText(INTRO_PLACEHOLDER);
    await user.click(screen.getByRole("button", { name: SAVE_BUTTON }));

    expect(
      await screen.findByText("자기소개는 500자까지 저장할 수 있어요.")
    ).toBeInTheDocument();
    expect(screen.queryByText(SAVED_FLASH)).not.toBeInTheDocument();
    const putCalls = fetchMock.mock.calls.filter(
      (args) => (args[1] as RequestInit | undefined)?.method === "PUT"
    );
    expect(putCalls).toHaveLength(0);
  });
});

const SAVE_ERROR = "저장에 실패했습니다. 잠시 후 다시 시도해 주세요.";
const LOAD_ERROR = "자기소개를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.";

describe("마이페이지 자기소개 — 저장 실패 (US3)", () => {
  test("저장이 실패하면 오류 안내를 표시하고 입력 내용을 유지한다", async () => {
    stubApi({
      get: { ok: true, body: { introduction: null } },
      put: { ok: false, body: { error: "SAVE_FAILED" } },
    });
    const user = userEvent.setup();

    renderMyPage();
    const textarea = await screen.findByPlaceholderText(INTRO_PLACEHOLDER);
    await user.type(textarea, "지키고 싶은 소개");
    await user.click(screen.getByRole("button", { name: SAVE_BUTTON }));

    expect(await screen.findByText(SAVE_ERROR)).toBeInTheDocument();
    expect(textarea).toHaveValue("지키고 싶은 소개");
    expect(screen.queryByText(SAVED_FLASH)).not.toBeInTheDocument();
  });

  test("저장 실패 후 재시도가 성공하면 오류 문구가 사라지고 확인 표시가 나타난다", async () => {
    let putCount = 0;
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PUT") {
        putCount += 1;
        return putCount === 1
          ? jsonResponse(false, { error: "SAVE_FAILED" })
          : jsonResponse(true, { introduction: "소개" });
      }
      return jsonResponse(true, { introduction: null });
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderMyPage();
    const textarea = await screen.findByPlaceholderText(INTRO_PLACEHOLDER);
    await user.type(textarea, "소개");
    await user.click(screen.getByRole("button", { name: SAVE_BUTTON }));
    expect(await screen.findByText(SAVE_ERROR)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: SAVE_BUTTON }));

    expect(await screen.findByText(SAVED_FLASH)).toBeInTheDocument();
    expect(screen.queryByText(SAVE_ERROR)).not.toBeInTheDocument();
    expect(textarea).toHaveValue("소개");
  });
});

describe("마이페이지 — 기존 기능 무회귀 (FR-009)", () => {
  test("별명 입력은 기존처럼 즉시 반영되고 로컬에 저장된다", async () => {
    stubApi({ get: { ok: true, body: { introduction: null } } });
    const user = userEvent.setup();

    renderMyPage();
    const nickname = await screen.findByPlaceholderText("별명");
    await user.clear(nickname);
    await user.type(nickname, "새별명");

    expect(nickname).toHaveValue("새별명");
    expect(screen.getByText("새별명")).toBeInTheDocument();
    const stored = JSON.parse(localStorage.getItem(LS_KEY) ?? "{}");
    expect(stored.profile.nickname).toBe("새별명");
  });

  test("이메일 입력은 여전히 비활성이다", async () => {
    stubApi({ get: { ok: true, body: { introduction: null } } });

    renderMyPage();
    await screen.findByPlaceholderText("별명");

    expect(screen.getByDisplayValue(DEFAULT_PROFILE.email)).toBeDisabled();
  });
});

describe("마이페이지 자기소개 — 불러오기 실패 (US3)", () => {
  test("불러오기가 실패하면 오류 안내를 표시하고 입력을 비활성화한다", async () => {
    stubApi({ get: { ok: false, body: { error: "LOAD_FAILED" } } });

    renderMyPage();

    expect(await screen.findByText(LOAD_ERROR)).toBeInTheDocument();
    const textarea = screen.getByLabelText("자기소개");
    expect(textarea).toBeDisabled();
    // 미등록 상태와 오인되지 않도록 입력 유도 placeholder는 표시하지 않는다
    expect(
      screen.queryByPlaceholderText(INTRO_PLACEHOLDER)
    ).not.toBeInTheDocument();
  });
});
