import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { RecheckAccess } from "@/components/RecheckAccess";
import { buttonClasses } from "@/components/ui/Button";

export const metadata: Metadata = { title: "For ward officials" };

// Shown (via a rewrite in src/proxy.ts) when a resident opens an officials-only page.
export default function NotAllowedPage() {
  return (
    <div className="grid flex-1 place-items-center px-6 py-20">
      <RecheckAccess roles={["official", "admin"]} />
      <div className="max-w-sm text-center">
        <LogoMark size={44} className="mx-auto" />
        <p className="eyebrow mt-6 text-ink-faint">Officials only</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-ink">This page is for ward officials</h1>
        <p className="mt-3 text-ink-soft">
          It holds each ward&apos;s work queue. If you work for the municipal corporation, request officer access and
          an admin will link your account to your ward.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/officer-access" className={buttonClasses()}>
            Request officer access
          </Link>
          <Link href="/" className={buttonClasses({ variant: "secondary" })}>
            Back to the map
          </Link>
        </div>
      </div>
    </div>
  );
}
