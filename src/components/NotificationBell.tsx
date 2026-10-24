"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { markAllRead, useNotifications, useNotificationsLive } from "@/hooks/useNotifications";
import { useSession } from "@/hooks/useSession";
import { timeAgo } from "@/lib/format";
import type { PublicNotification } from "@/lib/notifications";

const hrefFor = (n: PublicNotification) => (n.issue ? `/issues/${n.issue.id}` : "/officer-access");

export function NotificationBell() {
  const session = useSession();
  if (session.status !== "authenticated") return null;
  return <Bell />;
}

function Bell() {
  useNotificationsLive();
  const { items, unread } = useNotifications();
  const [open, setOpen] = useState(false);
  // What was new when the list opened, so it stays highlighted after being marked read.
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    if (!open) {
      setFresh(new Set(items.filter((n) => !n.read).map((n) => n.id)));
      void markAllRead();
    }
    setOpen((v) => !v);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative grid size-9 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5" aria-hidden>
          <path
            d="M6 17.5h12l-1.4-2V11a4.6 4.6 0 0 0-9.2 0v4.5L6 17.5Z M10 20a2 2 0 0 0 4 0"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-4.5 rounded-full bg-mint px-1 text-center font-mono text-[0.625rem] font-medium leading-4.5 text-pine-deep">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      <span aria-live="polite" className="sr-only">
        {unread > 0 ? `${unread} new notifications` : ""}
      </span>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-card border border-line bg-white shadow-pop">
          <p className="border-b border-line px-4 py-3 font-serif text-base font-bold text-ink">Notifications</p>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-soft">
              Nothing yet. You&apos;ll hear here when a fix near you needs checking.
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id} className="border-b border-line last:border-b-0">
                  <Link
                    href={hrefFor(n)}
                    onClick={() => setOpen(false)}
                    className={`block px-4 py-3 transition-colors hover:bg-mist ${fresh.has(n.id) ? "bg-mint/8" : ""}`}
                  >
                    <p className="text-sm font-bold text-ink">{n.message}</p>
                    {n.issue?.title && <p className="mt-0.5 truncate text-sm text-ink-soft">{n.issue.title}</p>}
                    {n.note && <p className="mt-0.5 text-sm italic text-ink-soft">&ldquo;{n.note}&rdquo;</p>}
                    <p className="mt-1 font-mono text-[0.6875rem] text-ink-faint">{timeAgo(n.createdAt)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
