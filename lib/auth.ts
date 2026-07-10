// Mock authentication for the hand-off prototype.
//
// The PRD calls for Google OAuth 2.0, but real OAuth needs client credentials
// and a callback server that can't run in a self-contained local prototype.
// We simulate the flow: the login button "signs in" and drops a flag in
// localStorage; the app shell guards on that flag. Swap these two helpers for
// a real provider (next-auth / Supabase Auth) to go live.

import { AUTH_KEY } from "./data";

export function isAuthed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(AUTH_KEY) === "1";
  } catch {
    return false;
  }
}

export function signIn() {
  try {
    localStorage.setItem(AUTH_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function signOut() {
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch {
    /* ignore */
  }
}
