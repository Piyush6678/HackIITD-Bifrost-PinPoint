"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

const LINKS = [
  { href: "/", label: "Map", icon: MapIcon },
  { href: "/report", label: "Report", icon: PlusIcon },
  { href: "/verify", label: "Verify", icon: CheckIcon },
  { href: "/scorecard", label: "Scorecard", icon: ChartIcon },
] as const;

type IsActive = (href: string) => boolean;
const nothingActive: IsActive = () => false;

function useIsActive(): IsActive {
  const pathname = usePathname();
  return (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

// With cacheComponents, usePathname suspends on routes whose params aren't known at
// build time (like /issues/[id]). The fallback is the same nav, just without the
// active marker, so the header renders identically while it resolves.
export function TopNav() {
  return (
    <Suspense fallback={<TopNavLinks isActive={nothingActive} />}>
      <ActiveTopNav />
    </Suspense>
  );
}

export function BottomNav() {
  return (
    <Suspense fallback={<BottomNavLinks isActive={nothingActive} />}>
      <ActiveBottomNav />
    </Suspense>
  );
}

function ActiveTopNav() {
  return <TopNavLinks isActive={useIsActive()} />;
}

function ActiveBottomNav() {
  return <BottomNavLinks isActive={useIsActive()} />;
}

function TopNavLinks({ isActive }: { isActive: IsActive }) {
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
      {LINKS.filter((l) => l.href !== "/report").map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className="rounded-md px-3 py-2 text-sm font-bold text-white/70 transition-colors hover:bg-white/5 hover:text-white aria-[current=page]:text-white aria-[current=page]:shadow-[inset_0_-2px_0_var(--color-mint)]"
        >
          {label}
        </Link>
      ))}
      <Link
        href="/report"
        className="ml-3 inline-flex items-center gap-2 rounded-md bg-mint px-4 py-2 text-sm font-bold text-pine-deep transition-colors hover:bg-[#19b597]"
      >
        <PlusIcon className="size-4" />
        Report an issue
      </Link>
    </nav>
  );
}

function BottomNavLinks({ isActive }: { isActive: IsActive }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
    >
      <ul className="grid grid-cols-4">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          const primary = href === "/report";
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2 text-[0.6875rem] font-bold ${
                  active ? "text-pine" : "text-ink-faint"
                }`}
              >
                <span
                  className={`grid size-8 place-items-center rounded-full ${
                    primary ? "bg-mint text-pine-deep" : ""
                  }`}
                >
                  <Icon className="size-5" />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type IconProps = { className?: string };

function MapIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z" strokeLinejoin="round" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}

function PlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={className} aria-hidden>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path d="M4 20h16" strokeLinecap="round" />
      <rect x="5.5" y="11" width="3" height="6" rx="0.5" />
      <rect x="10.5" y="7" width="3" height="10" rx="0.5" />
      <rect x="15.5" y="13" width="3" height="4" rx="0.5" />
    </svg>
  );
}
