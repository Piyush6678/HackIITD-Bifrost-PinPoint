"use client";

import { useEffect, useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import type { Role } from "@/lib/constants";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  ward?: { _id: string; name: string; number: number } | null;
};

type State =
  | { status: "loading"; user: null }
  | { status: "anonymous"; user: null }
  | { status: "authenticated"; user: SessionUser };

// One store for the whole tab, so the header and any page agree on who is logged in
// and /api/auth/me is only fetched once.
const LOADING: State = { status: "loading", user: null };
let state: State = LOADING;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  listeners.forEach((notify) => notify());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function refreshSession() {
  inflight ??= api<{ user: SessionUser }>("/api/auth/me")
    .then(({ user }) => set({ status: "authenticated", user }))
    .catch(() => set({ status: "anonymous", user: null }))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function setSessionUser(user: SessionUser) {
  set({ status: "authenticated", user });
}

export async function logOut() {
  await api("/api/auth/logout", { method: "POST" });
  set({ status: "anonymous", user: null });
}

export function useSession() {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => LOADING);

  useEffect(() => {
    if (state.status === "loading") refreshSession();
  }, []);

  return snapshot;
}
