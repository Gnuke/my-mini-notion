// Nook — data model, constants and helpers (ported from the design prototype)

export type CoverKey = "blue" | "green" | "amber" | "red" | "gray";

export interface Post {
  id: string;
  emoji: string;
  cover: CoverKey | null;
  title: string;
  body: string;
  updated: number;
  created: number;
}

export interface Profile {
  nickname: string;
  email: string;
  avatar: string | null;
}

export interface NookData {
  posts: Post[];
  selectedId: string | null;
  profile: Profile;
}

export const LS_KEY = "mini-nook-v1";
export const AUTH_KEY = "nook-auth";

export const EMOJIS = [
  "🗺️", "⚙️", "🧩", "🗄️", "✅", "📝", "💡", "📌",
  "🚀", "🧠", "🗂️", "⏰", "🌱", "🔖", "📊", "🎯",
];

export const COVERS: Record<CoverKey, string> = {
  blue: "#dbe8f8",
  green: "#dcefe2",
  amber: "#f7ebd6",
  red: "#f7dedb",
  gray: "#e9e9e6",
};

const H = 3600000;
const D = 86400000;

export function uid(): string {
  return "p" + Math.random().toString(36).slice(2, 9);
}

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

/** Fresh seed content, timestamped relative to "now" (called on the client). */
export function makeSeed(): Post[] {
  const now = Date.now();
  return [
    {
      id: "p1",
      emoji: "🗺️",
      cover: "blue",
      title: "미니 노션 PRD 정리",
      body:
        "개인이 스스로 업무를 기록·관리하는, 가장 작은 형태의 노션.\n\n" +
        "핵심 흐름: 목록 → /page로 새 글 → 상세 편집 → 자동 저장 → 삭제.\n\n" +
        "목표는 복잡한 기능 대신 내가 실제로 쓰는 기능만 담아 무료로 매일 쓰는 것.",
      updated: now - 5 * H,
      created: now - 5 * H,
    },
    {
      id: "p2",
      emoji: "⚙️",
      cover: null,
      title: "Google OAuth 2.0 연동 기록",
      body:
        "구글 로그인으로 인증하고, 성공 시 업무 페이지로 이동한다.\n\n" +
        "리디렉트 URI 등록과 토큰 저장 위치를 정리해 두자.",
      updated: now - 26 * H,
      created: now - 26 * H,
    },
    {
      id: "p3",
      emoji: "🧩",
      cover: null,
      title: "React로 /page 슬래시 명령 구현",
      body:
        "입력값이 '/'로 시작하면 명령 팔레트를 띄우고, 'page' 매칭 시 새 문서를 생성한다.\n\n" +
        "버튼과 명령 두 방식을 모두 제공해 편한 쪽으로 쓰게 한다.",
      updated: now - 2 * D,
      created: now - 2 * D,
    },
    {
      id: "p4",
      emoji: "🗄️",
      cover: null,
      title: "Supabase로 글 데이터 저장하기",
      body:
        "글이 새로고침·재로그인 후에도 100% 유지되어야 한다(데이터 유실 0건).\n\n" +
        "사용자별로 내가 만든 글만 보이도록 조회 조건을 건다.",
      updated: now - 6 * D,
      created: now - 6 * D,
    },
    {
      id: "p5",
      emoji: "✅",
      cover: null,
      title: "MVP 체크리스트",
      body:
        "- 글 목록 보기\n- /page 또는 버튼으로 새 글 생성\n- 상세 편집(제목/내용)\n" +
        "- 글 삭제(확인)\n- 데이터 저장·유지",
      updated: now - 9 * D,
      created: now - 9 * D,
    },
  ];
}

export const DEFAULT_PROFILE: Profile = {
  nickname: "경현",
  email: "kyunghyun@gmail.com",
  avatar: null,
};
