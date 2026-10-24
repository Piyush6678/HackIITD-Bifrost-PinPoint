import type { Types } from "mongoose";
import type { IIssue } from "@/models/Issue";
import { isOverdue } from "./categories";
import type { Status } from "./constants";

// Public scorecards, worked out from each issue's own history. Nothing here is
// stored: it's recomputed from the same records residents can see on issue pages.

const DAY_MS = 24 * 60 * 60 * 1000;

// Below this, a median says more about luck than about the ward.
export const MIN_SAMPLES = 3;

export type ScoredIssue = Pick<
  IIssue,
  "_id" | "status" | "category" | "createdAt" | "resolvedAt" | "failedVerifications" | "reopenCount" | "statusHistory"
>;

export function median(values: number[]) {
  if (values.length < MIN_SAMPLES) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const days = (from: Date, to: Date) => (to.getTime() - from.getTime()) / DAY_MS;
const round1 = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);

type Attempt = { by: string; outcome: "verified" | "failed" | "waiting" };

// Reads one issue's history as a list of fix attempts. An officer posting an
// after-photo opens an attempt; residents close it either way. Their entries carry
// no `by`, which is how a failed check differs from an officer restarting work.
export function fixAttempts(history: { status: Status; by?: Types.ObjectId | string }[]): Attempt[] {
  const attempts: Attempt[] = [];
  for (const entry of history) {
    const open = attempts.at(-1)?.outcome === "waiting" ? attempts.at(-1) : undefined;
    if (entry.status === "pending_verification" && entry.by) {
      attempts.push({ by: String(entry.by), outcome: "waiting" });
    } else if (open && entry.status === "resolved") {
      open.outcome = "verified";
    } else if (open && entry.status === "in_progress" && !entry.by) {
      open.outcome = "failed";
    }
  }
  return attempts;
}

// When the ward first did something visible: started work or posted a fix.
function firstAction(issue: ScoredIssue, by?: string) {
  return issue.statusHistory.find(
    (h) =>
      (h.status === "in_progress" || h.status === "pending_verification") && h.by && (!by || String(h.by) === by),
  );
}

export type Metrics = ReturnType<typeof scoreIssues>;
export type OfficerMetrics = ReturnType<typeof scoreOfficer>;

export function scoreIssues(issues: ScoredIssue[], now = new Date()) {
  const resolved = issues.filter((i) => i.status === "resolved" && i.resolvedAt);
  const attempts = issues.flatMap((i) => fixAttempts(i.statusHistory));
  const verified = attempts.filter((a) => a.outcome === "verified").length;
  const failed = attempts.filter((a) => a.outcome === "failed").length;
  const firstActions = issues.flatMap((i) => {
    const entry = firstAction(i);
    return entry ? [days(i.createdAt, entry.at)] : [];
  });

  return {
    reported: issues.length,
    open: issues.length - resolved.length,
    resolved: resolved.length,
    overdue: issues.filter((i) => isOverdue(i, now)).length,
    // Of the fixes residents have judged, the share they accepted.
    acceptanceRate: verified + failed >= MIN_SAMPLES ? Math.round((verified / (verified + failed)) * 100) : null,
    failedChecks: failed,
    cameBack: issues.reduce((n, i) => n + (i.reopenCount ?? 0), 0),
    medianDaysToFix: round1(median(resolved.map((i) => days(i.createdAt, i.resolvedAt!)))),
    medianDaysToFirstAction: round1(median(firstActions)),
  };
}

// The same numbers for one officer, counting only fixes they posted themselves:
// an issue moves with its officer's record, not with whoever holds the ward today.
export function scoreOfficer(issues: ScoredIssue[], officerId: string) {
  let verified = 0;
  let failed = 0;
  let waiting = 0;
  const fixDays: number[] = [];
  const actionDays: number[] = [];

  for (const issue of issues) {
    const mine = fixAttempts(issue.statusHistory).filter((a) => a.by === officerId);
    verified += mine.filter((a) => a.outcome === "verified").length;
    failed += mine.filter((a) => a.outcome === "failed").length;
    waiting += mine.filter((a) => a.outcome === "waiting").length;
    if (mine.some((a) => a.outcome === "verified") && issue.resolvedAt) fixDays.push(days(issue.createdAt, issue.resolvedAt));
    const first = firstAction(issue, officerId);
    if (first && first === firstAction(issue)) actionDays.push(days(issue.createdAt, first.at));
  }

  return {
    fixesPosted: verified + failed + waiting,
    verified,
    failedChecks: failed,
    waiting,
    acceptanceRate: verified + failed >= MIN_SAMPLES ? Math.round((verified / (verified + failed)) * 100) : null,
    medianDaysToFix: round1(median(fixDays)),
    medianDaysToFirstAction: round1(median(actionDays)),
  };
}

// Better acceptance first, then quicker fixes. Wards without enough data go last.
export function compareWards(a: Metrics, b: Metrics) {
  const rate = (m: Metrics) => m.acceptanceRate ?? -1;
  const speed = (m: Metrics) => m.medianDaysToFix ?? Number.POSITIVE_INFINITY;
  return rate(b) - rate(a) || speed(a) - speed(b) || b.resolved - a.resolved;
}
