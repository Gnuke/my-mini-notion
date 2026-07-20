// GET/PUT /api/profile — 별명(name)·이미지 경로 조회, 별명 저장 (004-profile-db)
//
// DB(profile 테이블)가 프로필의 단일 원천이다. 쿠키 세션으로 본인을 확인한 뒤
// 서비스 롤 키로 본인(user_id) 행만 읽고 쓴다 (lib/server/profile.ts).
import { NextResponse } from "next/server";
import {
  getServiceClient,
  getSessionUserId,
  selectMyProfile,
} from "@/lib/server/profile";

// Next.js가 GET 라우트와 서버 fetch를 데이터 캐시로 감싸 stale 값을
// 돌려줄 수 있으므로, 라우트와 DB 요청 모두 캐시를 쓰지 않게 고정한다.
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }

  const { row, failed } = await selectMyProfile(
    supabase,
    userId,
    "id, name, image_path"
  );
  if (failed) {
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "PROFILE_NOT_FOUND" }, { status: 500 });
  }

  const name = (row.name as string | null) ?? null;
  const imagePath = (row.image_path as string | null) ?? null;
  return NextResponse.json({
    // 공백뿐인 별명은 미등록(null)로 취급 — 클라이언트가 구글 이름으로 폴백.
    name: name && name.trim() !== "" ? name : null,
    imagePath: imagePath || null,
  });
}

export async function PUT(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || !("name" in body)) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const raw = (body as { name: unknown }).name;
  if (typeof raw !== "string") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const name = raw.trim();
  if (name === "") {
    return NextResponse.json({ error: "EMPTY_NAME" }, { status: 400 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "SAVE_FAILED" }, { status: 500 });
  }

  const { row, failed } = await selectMyProfile(supabase, userId, "id");
  if (failed) {
    return NextResponse.json({ error: "SAVE_FAILED" }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "PROFILE_NOT_FOUND" }, { status: 500 });
  }

  const { error } = await supabase
    .from("profile")
    .update({ name })
    .eq("id", row.id as string);
  if (error) {
    return NextResponse.json({ error: "SAVE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ name });
}
