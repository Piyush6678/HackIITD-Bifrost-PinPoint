"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { CONFIRM_RADIUS_M } from "@/lib/constants";
import { CATEGORY_LABELS, formatDistance, timeAgo } from "@/lib/format";
import { currentPosition } from "@/lib/location";
import type { PublicIssue } from "@/lib/serialize";
import { CategoryIcon } from "../issue/CategoryIcon";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";

type Fix = PublicIssue & {
  distance: number;
  verification: { confirms: number; rejects: number; needed: number };
};

type State =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; fixes: Fix[] };

export function NearbyFixes() {
  const [state, setState] = useState<State>({ status: "idle" });

  async function find() {
    setState({ status: "locating" });
    try {
      const { lat, lng } = await currentPosition();
      setState({ status: "loading" });
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radius: String(CONFIRM_RADIUS_M),
        status: "pending_verification",
      });
      const { issues } = await api<{ issues: Fix[] }>(`/api/issues/nearby?${params}`);
      setState({ status: "ready", fixes: issues });
    } catch (err) {
      const message =
        err instanceof ApiError || err instanceof Error ? err.message : "Couldn't look for fixes. Try again.";
      setState({ status: "error", message });
    }
  }

  const busy = state.status === "locating" || state.status === "loading";

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 md:py-10">
      <p className="eyebrow text-ink-faint">Verify</p>
      <h1 className="mt-1 font-serif text-[1.75rem] font-bold leading-tight text-ink md:text-4xl">
        Check fixes near you
      </h1>
      <p className="mt-2 text-ink-soft">
        When a ward officer says a problem is fixed, people nearby decide if it really is. Fixes within{" "}
        {CONFIRM_RADIUS_M} m of you are listed here.
      </p>

      <div className="mt-5 flex flex-col items-start gap-2">
        <Button onClick={find} loading={busy}>
          {state.status === "ready" ? "Search again" : "Find fixes near me"}
        </Button>
        {state.status === "idle" && <p className="text-xs text-ink-faint">Your location is only used for this search.</p>}
        {state.status === "locating" && <p className="text-xs text-ink-faint">Finding your location…</p>}
      </div>

      <div aria-live="polite" className="mt-6">
        {state.status === "error" && <Alert>{state.message}</Alert>}

        {state.status === "ready" &&
          (state.fixes.length === 0 ? (
            <EmptyState title="No fixes waiting near you">
              When an officer posts a fix close to you, it shows up here for you to check.
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {state.fixes.map((fix) => (
                <li key={fix.id}>
                  <FixCard fix={fix} />
                </li>
              ))}
            </ul>
          ))}
      </div>
    </div>
  );
}

function FixCard({ fix }: { fix: Fix }) {
  const { confirms, rejects, needed } = fix.verification;

  return (
    <Link
      href={`/issues/${fix.id}`}
      className="block rounded-card border border-line bg-white p-3 transition-colors hover:border-pine/40"
    >
      <div className="grid grid-cols-2 gap-2">
        <Thumb src={fix.photoUrl} label="Before" />
        <Thumb src={fix.resolutionPhotoUrl} label="After" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs font-bold text-ink-soft">
        <CategoryIcon category={fix.category} className="size-4" />
        {CATEGORY_LABELS[fix.category]}
        <span className="font-mono font-normal text-ink-faint">· {formatDistance(fix.distance)} away</span>
      </div>
      <h2 className="mt-1 font-serif text-base font-bold leading-snug text-ink">{fix.title}</h2>
      <p className="mt-1 font-mono text-xs text-ink-faint">
        {confirms} of {needed} say fixed · {rejects} of {needed} say not fixed · reported {timeAgo(fix.createdAt)}
      </p>
    </Link>
  );
}

function Thumb({ src, label }: { src: string | null; label: string }) {
  return (
    <div className="relative aspect-4/3 overflow-hidden rounded-md bg-mist">
      {src && (
        <Image
          src={src}
          alt={`${label} photo`}
          fill
          unoptimized
          sizes="(min-width: 672px) 320px, 45vw"
          className="object-cover"
        />
      )}
      <span className="absolute left-1.5 top-1.5 rounded bg-ink/70 px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-white">
        {label}
      </span>
    </div>
  );
}
