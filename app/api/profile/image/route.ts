// GET/POST /api/profile/image — 프로필 이미지 경로 조회/업로드 (003-profile-image)
//
// 업로드 파일은 Storage `profile-image` 버킷에 uuidv4 파일명으로 저장하고,
// profile.image_path 에는 버킷명 이후 경로만 기록한다. 공개 URL 앞부분은
// NEXT_PUBLIC_PROFILE_IMAGE_BASE_URL 환경변수로 클라이언트가 조합한다
// (lib/profile-image.ts). 쿠키 세션으로 본인을 확인한 뒤(미로그인 401)
// 서비스 롤 키로 본인(user_id) 행만 접근한다 (004-profile-db).
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PROFILE_IMAGE_BUCKET,
  PROFILE_IMAGE_MAX_BYTES,
} from "@/lib/profile-image";
import {
  getServiceClient,
  getSessionUserId,
  selectMyProfile,
} from "@/lib/server/profile";

// Next.js가 GET 라우트와 서버 fetch를 데이터 캐시로 감싸 stale 경로를
// 돌려줄 수 있으므로, 라우트와 DB 요청 모두 캐시를 쓰지 않게 고정한다.
export const dynamic = "force-dynamic";

// MIME → 확장자. 목록 밖 타입은 원본 파일명의 확장자로 폴백한다.
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
};

function fileExtension(file: File): string {
  const byMime = EXT_BY_MIME[file.type];
  if (byMime) return byMime;
  const match = /\.([a-z0-9]{1,10})$/i.exec(file.name || "");
  return match ? match[1].toLowerCase() : "";
}

/** 업로드된 파일 삭제 — 교체·롤백용 정리라 실패해도 무시한다. */
async function removeQuietly(supabase: SupabaseClient, path: string) {
  try {
    await supabase.storage.from(PROFILE_IMAGE_BUCKET).remove([path]);
  } catch {
    /* 정리 실패는 응답에 영향 없음 */
  }
}

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
    "id, image_path"
  );
  if (failed) {
    return NextResponse.json({ error: "LOAD_FAILED" }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "PROFILE_NOT_FOUND" }, { status: 500 });
  }

  const path = (row.image_path as string | null) ?? null;
  return NextResponse.json({ imagePath: path || null });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "NOT_IMAGE" }, { status: 400 });
  }
  if (file.size > PROFILE_IMAGE_MAX_BYTES) {
    return NextResponse.json({ error: "TOO_LARGE" }, { status: 400 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 500 });
  }

  const { row, failed } = await selectMyProfile(
    supabase,
    userId,
    "id, image_path"
  );
  if (failed) {
    return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "PROFILE_NOT_FOUND" }, { status: 500 });
  }

  const ext = fileExtension(file);
  const imagePath = ext
    ? `${crypto.randomUUID()}.${ext}`
    : crypto.randomUUID();

  const { error: uploadError } = await supabase.storage
    .from(PROFILE_IMAGE_BUCKET)
    .upload(imagePath, await file.arrayBuffer(), {
      contentType: file.type,
    });
  if (uploadError) {
    return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("profile")
    .update({ image_path: imagePath })
    .eq("id", row.id as string);
  if (updateError) {
    // 경로 기록에 실패하면 방금 올린 파일이 고아가 되므로 정리한다.
    await removeQuietly(supabase, imagePath);
    return NextResponse.json({ error: "SAVE_FAILED" }, { status: 500 });
  }

  // 교체 성공 시 이전 파일을 지워 저장소 누적을 막는다.
  const oldPath = (row.image_path as string | null) ?? null;
  if (oldPath && oldPath !== imagePath) {
    await removeQuietly(supabase, oldPath);
  }

  return NextResponse.json({ imagePath });
}
