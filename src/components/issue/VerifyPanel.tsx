"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/hooks/useSession";
import { api, ApiError } from "@/lib/api";
import { isAfterDark } from "@/lib/categories";
import { CONFIRM_RADIUS_M, FIX_MAX_ACCURACY_M } from "@/lib/constants";
import { formatDistance } from "@/lib/format";
import { distanceInMetres } from "@/lib/geo";
import { currentPosition } from "@/lib/location";
import type { serializeIssueDetail } from "@/lib/serialize";
import { Alert } from "../ui/Alert";
import { Button, buttonClasses } from "../ui/Button";

type IssueDetail = ReturnType<typeof serializeIssueDetail>;
type Vote = "confirm" | "reject";
export type Outcome = "verified" | "failed" | null;

type Props = {
  issue: IssueDetail;
  onVoted: (issue: IssueDetail, outcome: Outcome) => void;
};

// Shown while an officer's fix waits for residents. Whichever side reaches
// `needed` first decides it, so both tallies are always on screen.
export function VerifyPanel({ issue, onVoted }: Props) {
  const session = useSession();
  const pathname = usePathname();
  const [busy, setBusy] = useState<Vote | null>(null);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [away, setAway] = useState<{ distance: number; accuracy: number } | null>(null);
  const [checking, setChecking] = useState(false);
  const [dark] = useState(() => isAfterDark());
  const { confirms, rejects, needed } = issue.verification;
  const daylightBlocked = issue.verifyAfterDark && !dark;

  async function checkDistance() {
    setChecking(true);
    setError(null);
    try {
      const at = await currentPosition();
      setAway({ distance: distanceInMetres(at, issue.location), accuracy: at.accuracy });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't get your location. Try again.");
    } finally {
      setChecking(false);
    }
  }

  const tooFar = away !== null && away.distance > CONFIRM_RADIUS_M;
  const tooRough = away !== null && away.accuracy > FIX_MAX_ACCURACY_M;

  async function cast(vote: Vote) {
    setBusy(vote);
    setError(null);
    try {
      setStep("Checking you're near the issue");
      const at = await currentPosition();
      setStep(null);
      const result = await api<{ issue: IssueDetail; outcome: Outcome }>(`/api/issues/${issue.id}/confirm`, {
        method: "POST",
        json: { vote, ...at },
      });
      onVoted(result.issue, result.outcome);
    } catch (err) {
      setStep(null);
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Couldn't save your vote. Try again.");
    } finally {
      setBusy(null);
    }
  }

  let action;
  if (issue.myVote) {
    action = (
      <p className="rounded-md bg-mist px-3.5 py-3 text-sm text-ink">
        You said <strong>{issue.myVote === "confirm" ? "it's fixed" : "it isn't fixed"}</strong>. Thanks. The result
        shows here once {needed} people agree either way.
      </p>
    );
  } else if (session.status === "anonymous") {
    action = (
      <Link href={`/login?next=${encodeURIComponent(pathname)}`} className={buttonClasses({ className: "w-full" })}>
        Log in to vote
      </Link>
    );
  } else if (session.user && session.user.role !== "citizen") {
    action = <p className="text-sm text-ink-soft">Ward staff can&apos;t vote on fixes. Residents nearby decide.</p>;
  } else if (daylightBlocked) {
    action = (
      <p className="rounded-md bg-mist px-3.5 py-3 text-sm text-ink">
        Streetlights can only be checked after dark, between 6:30 pm and 5:30 am. Come back tonight.
      </p>
    );
  } else {
    action = (
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="accent"
            loading={busy === "confirm"}
            disabled={busy !== null || tooFar}
            onClick={() => cast("confirm")}
          >
            Fixed
          </Button>
          <Button
            variant="secondary"
            loading={busy === "reject"}
            disabled={busy !== null || tooFar}
            onClick={() => cast("reject")}
          >
            Not fixed
          </Button>
        </div>
        <p className="text-xs text-ink-faint">
          {step ?? `You need to be within ${CONFIRM_RADIUS_M} m of the issue. Your location is only used for this check.`}
        </p>
        <div aria-live="polite" className="text-sm">
          {away ? (
            <p className={tooFar || tooRough ? "font-bold text-brick" : "font-bold text-brand"}>
              {tooFar
                ? `You're ${formatDistance(away.distance)} away, only people within ${CONFIRM_RADIUS_M} m can vote.`
                : tooRough
                  ? `Your location is only accurate to ${Math.round(away.accuracy)} m. Step into the open and check again.`
                  : `You're ${formatDistance(away.distance)} away, you can vote.`}
            </p>
          ) : null}
          <button
            type="button"
            onClick={checkDistance}
            disabled={checking || busy !== null}
            className="font-bold text-brand hover:underline disabled:opacity-50"
          >
            {checking ? "Checking…" : away ? "Check again" : "Check if I can vote"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-status-pending/40 bg-white p-4 shadow-card">
      <p className="eyebrow text-status-pending">Is it fixed?</p>
      <h2 className="mt-1 font-serif text-lg font-bold leading-snug text-ink">The ward officer says this is fixed</h2>
      <p className="mt-1.5 text-sm text-ink-soft">{issue.verifyHint}</p>

      {issue.fix?.aiCheck && <AiCheck check={issue.fix.aiCheck} />}

      <div className="mt-4 flex flex-col gap-2.5" aria-label="Votes so far">
        <Tally label="Say fixed" count={confirms} needed={needed} tone="bg-mint" />
        <Tally label="Say not fixed" count={rejects} needed={needed} tone="bg-brick" />
      </div>

      <div className="mt-4">
        {error && (
          <div className="mb-3">
            <Alert>{error}</Alert>
          </div>
        )}
        {action}
      </div>
    </div>
  );
}

function Tally({ label, count, needed, tone }: { label: string; count: number; needed: number; tone: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-ink">{label}</span>
      <span className="flex items-center gap-2">
        <span className="flex gap-1" aria-hidden>
          {Array.from({ length: needed }, (_, i) => (
            <span key={i} className={`h-2 w-5 rounded-sm ${i < count ? tone : "bg-line"}`} />
          ))}
        </span>
        <span className="w-10 text-right font-mono text-xs text-ink-soft">
          {Math.min(count, needed)} of {needed}
        </span>
      </span>
    </div>
  );
}

type Check = NonNullable<NonNullable<IssueDetail["fix"]>["aiCheck"]>;

// Gemini's comparison of the two photos. A second opinion only, so it's worded
// as what the AI sees and never as a verdict.
function AiCheck({ check }: { check: Check }) {
  const doubt = !check.samePlace || !check.looksFixed;
  return (
    <div className="mt-3 rounded-md border border-amber/30 bg-amber/8 px-3.5 py-2.5 text-sm">
      <p className="font-bold text-amber">
        AI photo check{doubt ? ": worth a closer look" : ""}
        <span className="ml-1.5 font-mono text-[0.6875rem] font-normal text-ink-faint">{check.confidence} confidence</span>
      </p>
      <p className="mt-1 text-ink">{check.summary}</p>
      <p className="mt-1 text-xs text-ink-faint">
        {check.samePlace ? "Looks like the same spot" : "May not be the same spot"} ·{" "}
        {check.looksFixed ? "looks fixed" : "may not be fixed"}. Residents decide, not the AI.
      </p>
    </div>
  );
}
