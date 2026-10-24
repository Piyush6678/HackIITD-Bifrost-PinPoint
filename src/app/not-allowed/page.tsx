import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export const metadata: Metadata = { title: "For ward officials" };

// Shown (via a rewrite in src/proxy.ts) when a resident opens an officials-only page.
export default function NotAllowedPage() {
  return (
    <div className="grid flex-1 place-items-center px-6 py-20">
      <div className="max-w-sm text-center">
        <LogoMark size={44} className="mx-auto" />
        <p className="eyebrow mt-6 text-ink-faint">Officials only</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-ink">This page is for ward officials</h1>
        <p className="mt-3 text-ink-soft">
          It holds each ward&apos;s work queue. If you work for the municipal corporation, ask your PinPoint admin to
          link your account to your ward, then refresh this page.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex rounded-md bg-pine px-5 py-2.5 font-bold text-white transition-colors hover:bg-pine-soft"
        >
          Back to the map
        </Link>
      </div>
    </div>
  );
}
