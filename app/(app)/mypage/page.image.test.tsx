// 마이페이지 프로필 이미지 업로드 UI 테스트 (003-profile-image, 004-profile-db)
// 실제 스토어(NookProvider) 사용 — 모킹은 /api 네트워크 경계(global fetch)만.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { User } from "@supabase/supabase-js";
import MyPage from "@/app/(app)/mypage/page";
import { NookProvider } from "@/lib/store";
import { PROFILE_IMAGE_MAX_BYTES } from "@/lib/profile-image";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/mypage",
}));

const BASE_URL = "https://cdn.test/storage/v1/object/public/profile-image";
const FILE_INPUT = "프로필 이미지 업로드";
const UPLOADING = "이미지를 업로드하는 중…";
const UPLOAD_ERROR =
  "이미지 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.";

// 프로필 시드용 최소 유저 — 스토어가 있을 때만 DB 프로필을 조회한다.
const TEST_USER = {
  id: "user-1",
  email: "tester@nook.dev",
  user_metadata: {},
} as unknown as User;

type ImageJson = {
  imagePath?: string | null;
  name?: string | null;
  error?: string;
};

function jsonResponse(ok: boolean, body: unknown) {
  return { ok, json: async () => body };
}

/** URL별로 라우팅하는 fetch 스텁 — 자기소개 GET은 항상 미등록으로 응답한다. */
function stubApi(options: {
  profileGet?: { ok: boolean; body: ImageJson };
  imagePost?: { ok: boolean; body: ImageJson } | (() => Promise<never>);
}) {
  const fetchMock = vi.fn(async (url: unknown, init?: RequestInit) => {
    const u = String(url);
    if (u.includes("/api/profile/image") && init?.method === "POST") {
      const post = options.imagePost ?? {
        ok: true,
        body: { imagePath: null },
      };
      if (typeof post === "function") return post();
      return jsonResponse(post.ok, post.body);
    }
    if (u.includes("/api/profile/introduction")) {
      return jsonResponse(true, { introduction: null });
    }
    // 스토어의 프로필 조회 (GET /api/profile)
    const get = options.profileGet ?? {
      ok: true,
      body: { name: null, imagePath: null },
    };
    return jsonResponse(get.ok, get.body);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderMyPage(user?: User) {
  return render(
    <NookProvider user={user}>
      <MyPage />
    </NookProvider>
  );
}

function upload(file: File) {
  fireEvent.change(screen.getByLabelText(FILE_INPUT), {
    target: { files: [file] },
  });
}

function hasAvatarWithSrc(src: string): boolean {
  return Array.from(document.querySelectorAll("img")).some(
    (img) => img.getAttribute("src") === src
  );
}

function pngFile(name = "avatar.png", bytes = 8): File {
  return new File([new Uint8Array(bytes)], name, { type: "image/png" });
}

function postCalls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter(
    (args) => (args[1] as RequestInit | undefined)?.method === "POST"
  );
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_PROFILE_IMAGE_BASE_URL", BASE_URL);
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("마이페이지 프로필 이미지 — DB 동기화 (004-profile-db)", () => {
  test("저장된 image_path가 있으면 환경변수 앞부분과 조합한 URL로 아바타를 표시한다", async () => {
    stubApi({
      profileGet: {
        ok: true,
        body: { name: "테스터", imagePath: "abc.png" },
      },
    });

    renderMyPage(TEST_USER);
    await screen.findByLabelText(FILE_INPUT);

    await waitFor(() => {
      expect(hasAvatarWithSrc(`${BASE_URL}/abc.png`)).toBe(true);
    });
  });

  test("프로필 조회가 실패해도 화면은 표시되고 이니셜 폴백을 유지한다", async () => {
    stubApi({ profileGet: { ok: false, body: {} } });

    renderMyPage(TEST_USER);

    expect(await screen.findByLabelText(FILE_INPUT)).toBeInTheDocument();
    // TEST_USER 는 구글 사진이 없다 — 이미지 없이 이니셜 폴백
    expect(document.querySelectorAll("img")).toHaveLength(0);
  });
});

describe("마이페이지 프로필 이미지 — 업로드", () => {
  test("파일을 선택하면 POST로 업로드하고 응답 경로로 아바타를 교체한다", async () => {
    const fetchMock = stubApi({
      imagePost: { ok: true, body: { imagePath: "new-uuid.png" } },
    });

    renderMyPage();
    await screen.findByLabelText(FILE_INPUT);
    upload(pngFile());

    await waitFor(() => {
      expect(hasAvatarWithSrc(`${BASE_URL}/new-uuid.png`)).toBe(true);
    });
    const calls = postCalls(fetchMock);
    expect(calls).toHaveLength(1);
    const body = (calls[0][1] as RequestInit).body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect((body.get("file") as File).name).toBe("avatar.png");
  });

  test("업로드 중에는 안내 문구를 표시하고 파일 입력을 비활성화한다", async () => {
    stubApi({ imagePost: () => new Promise<never>(() => {}) });

    renderMyPage();
    await screen.findByLabelText(FILE_INPUT);
    upload(pngFile());

    expect(await screen.findByText(UPLOADING)).toBeInTheDocument();
    expect(screen.getByLabelText(FILE_INPUT)).toBeDisabled();
  });

  test("업로드가 실패하면 오류 안내를 표시하고 아바타를 바꾸지 않는다", async () => {
    stubApi({ imagePost: { ok: false, body: { error: "UPLOAD_FAILED" } } });

    renderMyPage();
    await screen.findByLabelText(FILE_INPUT);
    upload(pngFile());

    expect(await screen.findByText(UPLOAD_ERROR)).toBeInTheDocument();
    // 기본 프로필은 아바타가 없다 — 실패 시 이니셜 폴백 유지
    expect(document.querySelectorAll("img")).toHaveLength(0);
  });
});

describe("마이페이지 프로필 이미지 — 클라이언트 검증", () => {
  test("이미지가 아닌 파일은 요청 없이 안내만 표시한다", async () => {
    const fetchMock = stubApi({});

    renderMyPage();
    await screen.findByLabelText(FILE_INPUT);
    upload(new File(["텍스트"], "note.txt", { type: "text/plain" }));

    expect(
      await screen.findByText("이미지 파일만 업로드할 수 있어요.")
    ).toBeInTheDocument();
    expect(postCalls(fetchMock)).toHaveLength(0);
  });

  test("5MB를 넘는 이미지는 요청 없이 안내만 표시한다", async () => {
    const fetchMock = stubApi({});

    renderMyPage();
    await screen.findByLabelText(FILE_INPUT);
    upload(pngFile("big.png", PROFILE_IMAGE_MAX_BYTES + 1));

    expect(
      await screen.findByText("이미지는 5MB까지 업로드할 수 있어요.")
    ).toBeInTheDocument();
    expect(postCalls(fetchMock)).toHaveLength(0);
  });
});
