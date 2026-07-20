// 자기소개 값 규칙 + API 클라이언트 헬퍼 (002-profile-introduction)
// 저장처는 사용자가 만든 profile.introduction 컬럼 — 서버 라우트를 통해서만 접근.
import { countChars } from "./chars";

export const INTRO_MAX_CHARS = 500;

const API_PATH = "/api/profile/introduction";

/** 미등록 정규화: trim 결과가 빈 값이면 null, 내용이 있으면 원본 그대로. */
export function normalizeIntroduction(
  value: string | null | undefined
): string | null {
  if (value == null) return null;
  return value.trim() === "" ? null : value;
}

/** 500자(사용자 인지 글자 단위) 한도 초과 여부. */
export function isIntroTooLong(value: string): boolean {
  return countChars(value) > INTRO_MAX_CHARS;
}

/** 저장된 자기소개 조회 — 미등록이면 null, 실패하면 throw. */
export async function fetchIntroduction(): Promise<string | null> {
  const res = await fetch(API_PATH);
  if (!res.ok) throw new Error("LOAD_FAILED");
  const data = (await res.json()) as { introduction: string | null };
  return data.introduction ?? null;
}

/** 자기소개 저장 — 빈 값은 null로 정규화해 전송, 저장된 값을 반환, 실패하면 throw. */
export async function saveIntroduction(value: string): Promise<string | null> {
  const res = await fetch(API_PATH, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ introduction: normalizeIntroduction(value) }),
  });
  if (!res.ok) throw new Error("SAVE_FAILED");
  const data = (await res.json()) as { introduction: string | null };
  return data.introduction ?? null;
}
