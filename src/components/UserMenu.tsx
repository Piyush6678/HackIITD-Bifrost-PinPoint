"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logOut, useSession } from "@/hooks/useSession";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

const ROLE_LABEL = { citizen: "Resident", official: "Ward official", admin: "Admin" } as const;

export function UserMenu() {
  const session = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
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

  // Keeps the header from jumping while we find out who is logged in.
  if (session.status === "loading") return <span className="size-8 rounded-full bg-white/10" aria-hidden />;

  if (session.status === "anonymous") {
    const href = pathname === "/" || pathname === "/login" ? "/login" : `/login?next=${encodeURIComponent(pathname)}`;
    return (
      <Link
        href={href}
        className="rounded-md px-3 py-2 text-sm font-bold text-white/80 transition-colors hover:bg-white/5 hover:text-white"
      >
        Log in
      </Link>
    );
  }

  const { user } = session;

  async function onLogOut() {
    setOpen(false);
    await logOut();
    // Same reason as after login: drop anything the client router cached while logged in.
    window.location.reload();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${user.name}`}
        className="grid size-8 place-items-center rounded-full bg-mint/20 text-xs font-bold text-white ring-1 ring-mint/50 transition-colors hover:bg-mint/30"
      >
        {initials(user.name)}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-card border border-line bg-white shadow-pop"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="truncate font-bold text-ink">{user.name}</p>
            <p className="truncate text-sm text-ink-soft">{user.email}</p>
            <p className="eyebrow mt-2 text-brand">
              {ROLE_LABEL[user.role]}
              {user.ward ? ` · Ward ${user.ward.number}` : ""}
            </p>
          </div>
          {user.role !== "citizen" && (
            <MenuLink href="/dashboard" onClick={() => setOpen(false)}>
              Ward dashboard
            </MenuLink>
          )}
          {user.role === "admin" && (
            <MenuLink href="/admin" onClick={() => setOpen(false)}>
              Officer access requests
            </MenuLink>
          )}
          {user.role === "citizen" && (
            <MenuLink href="/officer-access" onClick={() => setOpen(false)}>
              I&apos;m a ward officer
            </MenuLink>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={onLogOut}
            className="w-full px-4 py-2.5 text-left text-sm font-bold text-ink transition-colors hover:bg-mist"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="block w-full px-4 py-2.5 text-left text-sm font-bold text-ink transition-colors hover:bg-mist"
    >
      {children}
    </Link>
  );
}
