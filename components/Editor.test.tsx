// Editor 글자 수 배지 UI 계약(C1~C3) 테스트 — 실제 스토어(NookProvider) 사용, 모킹 없음.
import { describe, expect, test, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Editor from "@/components/Editor";
import { NookProvider, useNook } from "@/lib/store";
import { LS_KEY, DEFAULT_PROFILE, type Post } from "@/lib/data";

const BODY_PLACEHOLDER =
  "여기에 입력하거나, 왼쪽에서 '/page'로 새 글을 만드세요…";
const TITLE_PLACEHOLDER = "제목 없음";

function makePost(overrides: Partial<Post> = {}): Post {
  const now = Date.now();
  return {
    id: "p1",
    emoji: "📝",
    cover: null,
    title: "",
    body: "",
    updated: now,
    created: now,
    ...overrides,
  };
}

function seed(posts: Post[], selectedId: string | null) {
  localStorage.setItem(
    LS_KEY,
    JSON.stringify({ posts, selectedId, profile: DEFAULT_PROFILE })
  );
}

function SwitchTo({ id }: { id: string }) {
  const { select } = useNook();
  return <button onClick={() => select(id)}>글 전환: {id}</button>;
}

beforeEach(() => {
  localStorage.clear();
});

describe("Editor — 글자 수 배지 (US1)", () => {
  test("본문이 빈 글을 열면 0자를 표시한다", async () => {
    const post = makePost({ body: "" });
    seed([post], post.id);

    render(
      <NookProvider>
        <Editor />
      </NookProvider>
    );

    expect(await screen.findByText("0자")).toBeInTheDocument();
  });

  test("본문에 입력하면 배지가 실시간으로 갱신된다", async () => {
    const post = makePost({ body: "" });
    seed([post], post.id);
    const user = userEvent.setup();

    render(
      <NookProvider>
        <Editor />
      </NookProvider>
    );
    await screen.findByText("0자");

    const body = screen.getByPlaceholderText(BODY_PLACEHOLDER);
    await user.type(body, "안녕하세요");

    expect(await screen.findByText("5자")).toBeInTheDocument();
  });

  test("일부 삭제하면 감소한 글자 수를 표시한다", async () => {
    const post = makePost({ body: "" });
    seed([post], post.id);
    const user = userEvent.setup();

    render(
      <NookProvider>
        <Editor />
      </NookProvider>
    );
    await screen.findByText("0자");

    const body = screen.getByPlaceholderText(BODY_PLACEHOLDER);
    await user.type(body, "안녕하세요");
    expect(await screen.findByText("5자")).toBeInTheDocument();

    await user.type(body, "{Backspace}{Backspace}");
    expect(await screen.findByText("3자")).toBeInTheDocument();
  });

  test("제목을 입력해도 글자 수는 변하지 않는다", async () => {
    const post = makePost({ body: "안녕하세요", title: "" });
    seed([post], post.id);
    const user = userEvent.setup();

    render(
      <NookProvider>
        <Editor />
      </NookProvider>
    );
    expect(await screen.findByText("5자")).toBeInTheDocument();

    const title = screen.getByPlaceholderText(TITLE_PLACEHOLDER);
    await user.type(title, "새 제목");

    expect(await screen.findByText("5자")).toBeInTheDocument();
  });
});

describe("Editor — 글 전환 시 배지 갱신 (US2)", () => {
  test("다른 글로 전환하면 배지가 새 글의 글자 수로 즉시 바뀐다", async () => {
    const postA = makePost({ id: "pA", body: "가나다" });
    const postB = makePost({ id: "pB", body: "" });
    seed([postA, postB], postA.id);
    const user = userEvent.setup();

    render(
      <NookProvider>
        <Editor />
        <SwitchTo id="pB" />
      </NookProvider>
    );
    expect(await screen.findByText("3자")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "글 전환: pB" }));

    expect(await screen.findByText("0자")).toBeInTheDocument();
  });
});

describe("Editor — 글 미선택 상태 (US3)", () => {
  test("선택된 글이 없으면 배지가 렌더되지 않는다", () => {
    const post = makePost({ id: "pA", body: "안녕" });
    seed([post], "존재하지-않는-id");

    render(
      <NookProvider>
        <Editor />
      </NookProvider>
    );

    expect(screen.queryByText(/자$/)).not.toBeInTheDocument();
  });
});
