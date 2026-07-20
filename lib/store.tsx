"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import {
  DEFAULT_PROFILE,
  LS_KEY,
  makeSeed,
  Post,
  Profile,
  uid,
  type NookData,
} from "./data";

/** 구글 계정(Supabase user)에서 프로필 초기값을 뽑아낸다. */
function profileFromUser(user: User): Profile {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (meta.full_name as string) ||
    (meta.name as string) ||
    user.email?.split("@")[0] ||
    "사용자";
  const avatar =
    (meta.avatar_url as string) || (meta.picture as string) || null;
  return { nickname: name, email: user.email ?? "", avatar };
}

interface NookStore {
  loaded: boolean;
  posts: Post[];
  selectedId: string | null;
  profile: Profile;
  saved: boolean;
  active: Post | null;
  select: (id: string) => void;
  newPost: () => string;
  patch: (fields: Partial<Post>) => void;
  remove: () => void;
  setNickname: (nickname: string) => void;
  setAvatar: (avatar: string | null) => void;
  flash: () => void;
}

const Ctx = createContext<NookStore | null>(null);

export function NookProvider({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: User | null;
}) {
  const [loaded, setLoaded] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [saved, setSaved] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load once on mount (client only) — avoids SSR/hydration mismatch.
  useEffect(() => {
    let data: Partial<NookData> = {};
    try {
      data = JSON.parse(localStorage.getItem(LS_KEY) || "{}") || {};
    } catch {
      /* ignore malformed storage */
    }
    const seeded = data.posts && data.posts.length ? data.posts : makeSeed();
    setPosts(seeded);
    setSelectedId(data.selectedId ?? seeded[0]?.id ?? null);

    // 프로필: 로그인된 유저가 있으면 구글 계정 정보로 시드하되,
    // 사용자가 직접 바꾼 별명/이미지(localStorage)는 유지한다.
    // 이메일은 항상 실제 계정 값을 신뢰(수정 불가).
    if (user) {
      const base = profileFromUser(user);
      const saved = data.profile;
      setProfile({
        nickname: saved?.nickname || base.nickname,
        email: base.email,
        avatar: saved?.avatar ?? base.avatar,
      });
    } else {
      setProfile(data.profile ?? DEFAULT_PROFILE);
    }
    setLoaded(true);
    // user?.id 가 바뀔 때만 다시 시드.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Persist whenever the meaningful slices change.
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({ posts, selectedId, profile })
      );
    } catch {
      /* storage may be full / unavailable */
    }
  }, [loaded, posts, selectedId, profile]);

  const flash = useCallback(() => {
    setSaved(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSaved(false), 1500);
  }, []);

  const select = useCallback((id: string) => setSelectedId(id), []);

  const newPost = useCallback(() => {
    const p: Post = {
      id: uid(),
      emoji: "📝",
      cover: null,
      title: "",
      body: "",
      updated: Date.now(),
      created: Date.now(),
    };
    setPosts((prev) => [p, ...prev]);
    setSelectedId(p.id);
    return p.id;
  }, []);

  const patch = useCallback(
    (fields: Partial<Post>) => {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === selectedId ? { ...p, ...fields, updated: Date.now() } : p
        )
      );
      flash();
    },
    [selectedId, flash]
  );

  const remove = useCallback(() => {
    setPosts((prev) => {
      const next = prev.filter((p) => p.id !== selectedId);
      setSelectedId(next[0]?.id ?? null);
      return next;
    });
  }, [selectedId]);

  const setNickname = useCallback((nickname: string) => {
    setProfile((prev) => ({ ...prev, nickname }));
  }, []);

  const setAvatar = useCallback((avatar: string | null) => {
    setProfile((prev) => ({ ...prev, avatar }));
  }, []);

  const active = posts.find((p) => p.id === selectedId) ?? null;

  const value: NookStore = {
    loaded,
    posts,
    selectedId,
    profile,
    saved,
    active,
    select,
    newPost,
    patch,
    remove,
    setNickname,
    setAvatar,
    flash,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNook(): NookStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNook must be used within <NookProvider>");
  return ctx;
}
