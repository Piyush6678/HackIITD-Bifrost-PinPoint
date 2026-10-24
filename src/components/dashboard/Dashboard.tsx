"use client";

import { useCallback, useState } from "react";
import { useQueue, type QueueIssue } from "@/hooks/useQueue";
import type { Status } from "@/lib/constants";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Skeleton } from "../ui/Skeleton";
import { IssueDrawer } from "./IssueDrawer";
import { QueueTable } from "./QueueTable";

const TABS: { status: Status; label: string; empty: string }[] = [
  { status: "open", label: "Open", empty: "Nothing waiting. New reports for your ward show up here." },
  { status: "in_progress", label: "In progress", empty: "No work has been started yet." },
  { status: "pending_verification", label: "Awaiting residents", empty: "No fixes are waiting for residents to confirm." },
  { status: "resolved", label: "Resolved", empty: "No fixes have been confirmed yet." },
];

export function Dashboard() {
  const [status, setStatus] = useState<Status>("open");
  const [selected, setSelected] = useState<QueueIssue | null>(null);
  const { queue, error, loading, retry } = useQueue(status);
  const closeDrawer = useCallback(() => setSelected(null), []);
  const tab = TABS.find((t) => t.status === status)!;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
      <p className="eyebrow text-ink-faint">Ward dashboard</p>
      <h1 className="mt-1 font-serif text-[1.75rem] font-bold leading-tight text-ink md:text-4xl">
        {queue?.ward ? `Ward ${queue.ward.number} · ${queue.ward.name}` : "Your ward"}
      </h1>
      <p className="mt-1.5 text-sm text-ink-soft">
        Ranked by how many people are affected, then severity, then how long it has waited.
      </p>

      <div role="tablist" aria-label="Issue status" className="mt-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map(({ status: value, label }) => {
          const active = value === status;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              id={`tab-${value}`}
              aria-selected={active}
              aria-controls="queue-panel"
              onClick={() => {
                setStatus(value);
                setSelected(null);
              }}
              className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${
                active ? "border-mint text-pine" : "border-transparent text-ink-faint hover:text-ink"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div id="queue-panel" role="tabpanel" aria-labelledby={`tab-${status}`} className="mt-5">
        {error ? (
          <div className="flex flex-col items-start gap-3">
            <Alert>{error}</Alert>
            <Button variant="secondary" onClick={retry}>
              Try again
            </Button>
          </div>
        ) : loading ? (
          <QueueSkeleton />
        ) : queue && queue.issues.length === 0 ? (
          <EmptyState title="All clear">{tab.empty}</EmptyState>
        ) : (
          queue && <QueueTable issues={queue.issues} selectedId={selected?.id} onSelect={setSelected} />
        )}
      </div>

      <IssueDrawer issue={selected} onClose={closeDrawer} />
    </div>
  );
}

function QueueSkeleton() {
  return (
    <div role="status" aria-label="Loading work queue" className="flex flex-col gap-2">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}
