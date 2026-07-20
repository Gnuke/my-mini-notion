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
import { DEFAULT_PROFILE, LS_KEY, Post, Profile } from "./data";
import { getSupabase } from "./supabase/client";
import { createPage, deletePage, fetchPages, updatePage } from "./pages";

const SAVE_DEBOUNCE_MS = 600; // research.md R4
const SAVED_FLASH_MS = 1500;

type FailedOp = "update" | "delete" | null;

interface PendingSave {
  id: string;
  fields: { title?: string; body?: string };
}

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
  // 목록 로딩 (FR-011)
  loading: boolean;
  loadError: boolean;
  retry: () => void;

  // 데이터
  posts: Post[];
  selectedId: string | null;
  active: Post | null;

  // 조작
  select: (id: string) => void;
  newPost: () => Promise<string | null>;
  patch: (fields: { title?: string; body?: string }) => void;
  remove: () => Promise<void>;

  // 저장 표시 (FR-012, FR-007)
  saved: boolean;
  saveFailed: FailedOp;
  createFailed: boolean;

  // 프로필 (이 기능 범위 밖 — 기존 동작 유지)
  profile: Profile;
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadKey, setLoadKey] = useState(0);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [saved, setSaved] = useState(false);
  const [saveFailed, setSaveFailed] = useState<FailedOp>(null);
  const [createFailed, setCreateFailed] = useState(false);

  const userIdRef = useRef<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const postsRef = useRef<Post[]>([]);
  const pendingRef = useRef<PendingSave | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileReady = useRef(false);

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  // 프로필만 localStorage에서 복원·영속한다. 글·선택 상태는 서버 저장으로
  // 전환되어 기록하지 않는다 (FR-006).
  // 로그인된 유저가 있으면 구글 계정 정보로 프로필을 시드하되, 사용자가
  // 직접 바꾼 별명/이미지(localStorage)는 유지한다. 이메일은 항상 실제
  // 계정 값을 신뢰(수정 불가).
  useEffect(() => {
    let stored: Profile | undefined;
    try {
      const data = JSON.parse(localStorage.getItem(LS_KEY) || "{}") || {};
      if (data.profile) stored = data.profile as Profile;
    } catch {
      /* ignore malformed storage */
    }
    if (user) {
      const base = profileFromUser(user);
      setProfile({
        nickname: stored?.nickname || base.nickname,
        email: base.email,
        avatar: stored?.avatar ?? base.avatar,
      });
    } else {
      setProfile(stored ?? DEFAULT_PROFILE);
    }
    profileReady.current = true;
    // user?.id 가 바뀔 때만 다시 시드.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!profileReady.current) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ profile }));
    } catch {
      /* storage may be full / unavailable */
    }
  }, [profile]);

  // 서버에서 내 글 목록 로드 (RLS가 본인 행만 반환).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const { data } = await getSupabase().auth.getUser();
        if (cancelled) return;
        userIdRef.current = data.user?.id ?? null;
        // 세션이 없으면 데이터 요청 없이 종료 — 로그인 화면 안내는 기존
        // 가드 흐름이 담당한다 (FR-001, US3; 실제 인증 전환은 별도 기능).
        if (!data.user) {
          setLoading(false);
          return;
        }
        const list = await fetchPages();
        if (cancelled) return;
        setPosts(list);
        selectedIdRef.current = list[0]?.id ?? null;
        setSelectedId(list[0]?.id ?? null);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setLoadError(true);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadKey]);

  const retry = useCallback(() => setLoadKey((k) => k + 1), []);

  const flash = useCallback(() => {
    setSaved(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSaved(false), SAVED_FLASH_MS);
  }, []);

  // 서버 저장 성공 시에만 "저장됨" 표시를 켠다 (FR-012).
  const flashSaved = useCallback(() => {
    setSaveFailed(null);
    flash();
  }, [flash]);

  // 보류 중인 변경을 서버에 저장. 실패하면 보류분을 되살려 다음 저장에서
  // 재전송하고, 편집 내용은 로컬 상태에 그대로 남는다 (FR-007).
  const flushPending = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (!pending) return;
    try {
      await updatePage(pending.id, pending.fields);
      flashSaved();
    } catch {
      const queued = pendingRef.current as PendingSave | null;
      if (!queued) {
        pendingRef.current = pending;
      } else if (queued.id === pending.id) {
        pendingRef.current = {
          id: pending.id,
          fields: { ...pending.fields, ...queued.fields },
        };
      }
      setSaved(false);
      setSaveFailed("update");
    }
  }, [flashSaved]);

  const patch = useCallback(
    (fields: { title?: string; body?: string }) => {
      const id = selectedIdRef.current;
      if (!id) return;
      // 로컬은 즉시 반영해 입력 반응성을 유지한다 (R4).
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...fields } : p))
      );
      if (pendingRef.current && pendingRef.current.id !== id) {
        void flushPending();
      }
      const cur = pendingRef.current;
      pendingRef.current =
        cur && cur.id === id
          ? { id, fields: { ...cur.fields, ...fields } }
          : { id, fields: { ...fields } };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void flushPending();
      }, SAVE_DEBOUNCE_MS);
    },
    [flushPending]
  );

  const select = useCallback(
    (id: string) => {
      if (pendingRef.current) void flushPending();
      selectedIdRef.current = id;
      setSelectedId(id);
    },
    [flushPending]
  );

  const newPost = useCallback(async () => {
    if (pendingRef.current) void flushPending();
    try {
      const userId = userIdRef.current;
      if (!userId) throw new Error("세션 없음");
      const post = await createPage(userId);
      setPosts((prev) => [post, ...prev]);
      selectedIdRef.current = post.id;
      setSelectedId(post.id);
      setCreateFailed(false);
      flashSaved();
      return post.id;
    } catch {
      setCreateFailed(true);
      return null;
    }
  }, [flushPending, flashSaved]);

  const remove = useCallback(async () => {
    const id = selectedIdRef.current;
    if (!id) return;
    try {
      await deletePage(id);
      // 삭제된 글의 보류 저장은 폐기한다.
      if (pendingRef.current?.id === id) {
        pendingRef.current = null;
        if (saveTimer.current) {
          clearTimeout(saveTimer.current);
          saveTimer.current = null;
        }
      }
      const next = postsRef.current.filter((p) => p.id !== id);
      setPosts(next);
      selectedIdRef.current = next[0]?.id ?? null;
      setSelectedId(next[0]?.id ?? null);
      setSaveFailed(null);
    } catch {
      setSaveFailed("delete");
    }
  }, []);

  // 언마운트 시 보류 변경을 마지막으로 저장한다.
  useEffect(() => {
    return () => {
      if (pendingRef.current) void flushPending();
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, [flushPending]);

  const setNickname = useCallback((nickname: string) => {
    setProfile((prev) => ({ ...prev, nickname }));
  }, []);

  const setAvatar = useCallback((avatar: string | null) => {
    setProfile((prev) => ({ ...prev, avatar }));
  }, []);

  const active = posts.find((p) => p.id === selectedId) ?? null;

  const value: NookStore = {
    loading,
    loadError,
    retry,
    posts,
    selectedId,
    active,
    select,
    newPost,
    patch,
    remove,
    saved,
    saveFailed,
    createFailed,
    profile,
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
