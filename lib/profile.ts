// 프로필(별명·이미지 경로) API 클라이언트 헬퍼 (004-profile-db)
// 저장처는 Supabase profile 테이블(name·image_path) — DB가 단일 원천이며
// localStorage에는 저장하지 않는다. 서버 라우트를 통해서만 접근한다.

const API_PATH = "/api/profile";

export interface ProfileData {
  name: string | null;
  imagePath: string | null;
}

/** 내 프로필(별명·이미지 경로) 조회 — 실패하면 throw. */
export async function fetchProfile(): Promise<ProfileData> {
  const res = await fetch(API_PATH);
  if (!res.ok) throw new Error("LOAD_FAILED");
  const data = (await res.json()) as Partial<ProfileData>;
  return { name: data.name ?? null, imagePath: data.imagePath ?? null };
}

/** 별명 저장 — 저장된 값(앞뒤 공백 제거됨)을 반환, 실패하면 throw. */
export async function saveProfileName(name: string): Promise<string> {
  const res = await fetch(API_PATH, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("SAVE_FAILED");
  const data = (await res.json()) as { name?: string | null };
  if (!data.name) throw new Error("SAVE_FAILED");
  return data.name;
}
