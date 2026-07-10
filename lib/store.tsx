"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_PROFILE,
  LS_KEY,
  makeSeed,
  Post,
  Profile,
  uid,
  type NookData,
} from "./data";

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

export function NookProvider({ children }: { children: React.ReactNode }) {
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
    setProfile(data.profile ?? DEFAULT_PROFILE);
    setLoaded(true);
  }, []);

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
