import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { RecheckAccess } from "@/components/RecheckAccess";
import { buttonClasses } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Admins only" };

// Shown (via a rewrite in src/proxy.ts) when anyone but an admin opens /admin.
export default function AdminOnlyPage() {
  return (
    <div className="grid flex-1 place-items-center px-6 py-20">
      <RecheckAccess roles={["admin"]} />
      <div className="max-w-sm text-center">
        <LogoMark size={44} className="mx-auto" />
        <p className="eyebrow mt-6 text-ink-faint">Admins only</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-ink">This page is for PinPoint admins</h1>
        <p className="mt-3 text-ink-soft">
          Admins review officer access requests and assign officers to wards. Your account doesn&apos;t have admin
          access.
        </p>
        <Link href="/" className={buttonClasses({ className: "mt-7" })}>
          Back to the map
        </Link>
      </div>
    </div>
  );
}
