"use client";

import { useEffect, useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import type { PublicNotification } from "@/lib/notifications";

type State = { items: PublicNotification[]; unread: number };

const POLL_MS = 60_000;
const EMPTY: State = { items: [], unread: 0 };

// One store per tab, like useSession, so the bell and the issue page agree.
let state: State = EMPTY;
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  listeners.forEach((notify) => notify());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function load() {
  try {
    const { notifications, unreadCount } = await api<{ notifications: PublicNotification[]; unreadCount: number }>(
      "/api/notifications",
    );
    set({ items: notifications, unread: unreadCount });
  } catch {
    // Keep what we have; the next poll tries again.
  }
}

function receive(incoming: PublicNotification) {
  if (state.items.some((n) => n.id === incoming.id)) return;
  set({ items: [incoming, ...state.items], unread: state.unread + (incoming.read ? 0 : 1) });
}

export async function markAllRead() {
  if (state.unread === 0) return;
  set({ items: state.items.map((n) => ({ ...n, read: true })), unread: 0 });
  try {
    await api("/api/notifications/read", { method: "POST", json: { all: true } });
  } catch {
    await load();
  }
}

let watchers = 0;
let source: EventSource | null = null;
let timer: ReturnType<typeof setInterval> | undefined;

function connect() {
  if (source || typeof EventSource === "undefined") return;
  const stream = new EventSource("/api/stream");
  source = stream;

  // Anything that arrived while we weren't connected is picked up on (re)connect.
  stream.addEventListener("open", () => void load());
  stream.addEventListener("notification", (event) => receive(JSON.parse((event as MessageEvent<string>).data)));
  const drop = () => {
    stream.close();
    if (source === stream) source = null;
  };
  stream.addEventListener("unavailable", drop);
  stream.addEventListener("error", drop);
}

function start() {
  void load();
  connect();
  // The stream can be cut by the host, so polling runs on its own whenever it isn't up.
  timer = setInterval(() => {
    if (source?.readyState === EventSource.OPEN) return;
    void load();
    connect();
  }, POLL_MS);
}

function stop() {
  clearInterval(timer);
  source?.close();
  source = null;
  set(EMPTY);
}

// Call from something that is mounted only while someone is logged in.
export function useNotificationsLive() {
  useEffect(() => {
    if (watchers++ === 0) start();
    return () => {
      if (--watchers === 0) stop();
    };
  }, []);
}

export function useNotifications() {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}

export function hasVerifyRequest(items: PublicNotification[], issueId: string) {
  return items.some((n) => n.kind === "verify_request" && n.issue?.id === issueId);
}
