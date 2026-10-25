"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { PublicRun } from "@/lib/contactImport";
import { timeAgo } from "@/lib/format";
import { Alert } from "../ui/Alert";
import { EmptyState } from "../ui/EmptyState";
import { Skeleton } from "../ui/Skeleton";

const KIND_LABEL: Record<PublicRun["kind"], string> = {
  wards: "Ward boundaries",
  roads: "Notified roads",
  contacts: "Ward contacts",
  notices: "Official notices",
  records_check: "Officer record check",
};

const STATUS_TONE: Record<PublicRun["status"], string> = {
  running: "bg-cobalt/10 text-cobalt",
  needs_review: "bg-amber/15 text-[#9a5c12]",
  applied: "bg-mint/12 text-brand",
  completed: "bg-mint/12 text-brand",
  rejected: "bg-mist text-ink-soft",
  failed: "bg-brick/10 text-brick",
};

// Everything TinyFish has been asked to do, so the agent's work is never invisible.
export function ImportRunsTab() {
  const [state, setState] = useState<{ runs?: PublicRun[]; error?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ runs: PublicRun[] }>("/api/admin/import-runs")
      .then(({ runs }) => !cancelled && setState({ runs }))
      .catch((err) => !cancelled && setState({ error: err instanceof ApiError ? err.message : "Couldn't load the log." }));
    return () => {
      cancelled = true;
    };
  }, []);

  if (state?.error) return <Alert>{state.error}</Alert>;
  if (!state?.runs) return <Skeleton className="h-40 w-full rounded-card" />;
  if (state.runs.length === 0) {
    return <EmptyState title="No runs yet">Imports, monitor updates and record checks are logged here.</EmptyState>;
  }

  return (
    <ul className="flex flex-col divide-y divide-line rounded-card border border-line bg-white">
      {state.runs.map((run) => (
        <li key={run.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink">{KIND_LABEL[run.kind]}</p>
            <p className="truncate font-mono text-[0.6875rem] text-ink-faint">{run.source}</p>
            {(run.summary || run.error) && (
              <p className={`mt-0.5 text-xs ${run.error ? "text-brick" : "text-ink-soft"}`}>{run.error ?? run.summary}</p>
            )}
          </div>
          <div className="text-right">
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_TONE[run.status]}`}>
              {run.status.replace("_", " ")}
            </span>
            <p className="mt-1 font-mono text-[0.6875rem] text-ink-faint">{timeAgo(run.startedAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
