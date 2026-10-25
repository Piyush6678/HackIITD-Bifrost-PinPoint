import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="grid flex-1 place-items-center px-6 py-20">
      <div className="max-w-sm text-center">
        <LogoMark size={44} className="mx-auto" />
        <p className="eyebrow mt-6 text-ink-faint">404</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-ink">Nothing pinned here</h1>
        <p className="mt-3 text-ink-soft">
          This page doesn&apos;t exist, or isn&apos;t built yet. The map is a better place to start.
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
