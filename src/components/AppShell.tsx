import Link from "next/link";
import { Logo } from "./Logo";
import { BottomNav, TopNav } from "./NavLinks";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded bg-white px-3 py-2 text-sm font-bold text-pine focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 bg-pine">
        <div className="flex h-14 items-center justify-between px-4 md:h-16 md:px-6">
          <Link href="/" aria-label="PinPoint home" className="rounded-md">
            <Logo size={26} />
          </Link>

          <div className="flex items-center gap-4">
            <span className="hidden font-mono text-[0.6875rem] text-white/50 lg:inline">
              Pilot · Karol Bagh zone, Delhi
            </span>
            <TopNav />
          </div>
        </div>
      </header>

      {/* Bottom padding keeps content clear of the mobile tab bar. */}
      <main id="main" className="flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </main>

      <BottomNav />
    </>
  );
}
