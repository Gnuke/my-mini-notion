// Nook — data model, constants and helpers

// page 테이블에 대응하는 클라이언트 글 모델 (data-model.md §2).
// 저장 컬럼이 없는 emoji/cover/updated는 UI와 함께 제거됨 (FR-009).
export interface Post {
  id: string; // page.id (uuid, DB 생성)
  title: string; // page.title
  body: string; // page.content (null → "")
  created: number; // page.created_at → epoch ms
}

export interface Profile {
  nickname: string;
  email: string;
  avatar: string | null;
}

// 프로필 영속에만 사용한다. 글·선택 상태는 서버 저장으로 전환되어
// localStorage에 기록하지 않는다 (FR-006).
export const LS_KEY = "mini-nook-v1";

const H = 3600000;
const D = 86400000;

/** Relative Korean time label — "방금", "3분 전", "2일 전", "7월 7일". */
export function rel(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "방금";
  if (diff < H) return Math.floor(diff / 60000) + "분 전";
  if (diff < D) return Math.floor(diff / H) + "시간 전";
  if (diff < 7 * D) return Math.floor(diff / D) + "일 전";
  const t = new Date(ts);
  return t.getMonth() + 1 + "월 " + t.getDate() + "일";
}

export const DEFAULT_PROFILE: Profile = {
  nickname: "경현",
  email: "kyunghyun@gmail.com",
  avatar: null,
};
