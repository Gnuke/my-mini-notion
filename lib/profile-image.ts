// 프로필 이미지 규칙 + API 클라이언트 헬퍼 (003-profile-image)
// 원본 파일은 Supabase Storage `profile-image` 버킷에 uuidv4 파일명으로 저장하고
// (서버 라우트 경유), profile.image_path 에는 버킷명 이후 경로만 기록한다.
// 표시 URL은 앞부분(NEXT_PUBLIC_PROFILE_IMAGE_BASE_URL — 스토리지 주소~버킷명)과
// 뒷부분(image_path)을 이어 붙여 만든다.

export const PROFILE_IMAGE_BUCKET = "profile-image";
export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5MB

const API_PATH = "/api/profile/image";

/** 업로드 가능한 이미지 파일인지 (MIME 타입 기준). */
export function isImageFile(file: { type: string }): boolean {
  return file.type.startsWith("image/");
}

/** 5MB 용량 한도 초과 여부. */
export function isImageTooLarge(file: { size: number }): boolean {
  return file.size > PROFILE_IMAGE_MAX_BYTES;
}

/** image_path(버킷명 이후 경로) → 공개 URL. 환경변수나 경로가 없으면 null. */
export function profileImageUrl(
  path: string | null | undefined
): string | null {
  const base = process.env.NEXT_PUBLIC_PROFILE_IMAGE_BASE_URL;
  if (!base || !path) return null;
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

/** 저장된 image_path 조회 — 미등록이면 null, 실패하면 throw. */
export async function fetchProfileImagePath(): Promise<string | null> {
  const res = await fetch(API_PATH);
  if (!res.ok) throw new Error("LOAD_FAILED");
  const data = (await res.json()) as { imagePath?: string | null };
  return data.imagePath ?? null;
}

/** 이미지 업로드 — 저장된 image_path(버킷명 이후 경로)를 반환, 실패하면 throw. */
export async function uploadProfileImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(API_PATH, { method: "POST", body: form });
  if (!res.ok) throw new Error("UPLOAD_FAILED");
  const data = (await res.json()) as { imagePath?: string | null };
  if (!data.imagePath) throw new Error("UPLOAD_FAILED");
  return data.imagePath;
}
