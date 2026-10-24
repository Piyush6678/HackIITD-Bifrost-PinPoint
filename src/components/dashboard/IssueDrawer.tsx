"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { QueueIssue } from "@/hooks/useQueue";
import { CATEGORY_LABELS, formatCoords, formatDate, formatHours } from "@/lib/format";
import { CategoryIcon } from "../issue/CategoryIcon";
import { SeverityMeter } from "../issue/SeverityMeter";
import { StatusPill } from "../issue/StatusPill";
import { buttonClasses } from "../ui/Button";

type Props = {
  issue: QueueIssue | null;
  onClose: () => void;
};

export function IssueDrawer({ issue, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = issue !== null;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!issue) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-ink/40" />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto bg-white shadow-pop"
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-bold text-ink-soft">
                <CategoryIcon category={issue.category} className="size-4" />
                {CATEGORY_LABELS[issue.category]}
              </span>
              <StatusPill status={issue.status} size="sm" />
            </div>
            <h2 id="drawer-title" className="mt-2 font-serif text-xl font-bold leading-snug text-ink">
              {issue.title}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-md text-ink-soft hover:bg-mist"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4" aria-hidden>
              <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-5 px-5 py-5">
          {issue.photoUrl && (
            <div className="relative aspect-4/3 overflow-hidden rounded-card border border-line bg-mist">
              <Image
                src={issue.photoUrl}
                alt={`Photo of the reported problem: ${issue.title}`}
                fill
                unoptimized
                sizes="448px"
                className="object-cover"
              />
            </div>
          )}

          <SeverityMeter value={issue.severity} />

          {issue.description && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">{issue.description}</p>
          )}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-card bg-mist px-4 py-4">
            <Meta label="Affected">{issue.upvoteCount}</Meta>
            <Meta label="Open for">{formatHours(issue.hoursOpen)}</Meta>
            <Meta label="Reported">{formatDate(issue.createdAt)}</Meta>
            <Meta label="Due by">
              <span className={issue.overdue ? "font-medium text-brick" : undefined}>
                {formatDate(issue.dueAt)}
                {issue.overdue ? " · overdue" : ""}
              </span>
            </Meta>
            <div className="col-span-2">
              <Meta label="Coordinates">{formatCoords(issue.location, 5)}</Meta>
            </div>
            {issue.reopenCount > 0 && (
              <Meta label="Reopened">
                {issue.reopenCount} {issue.reopenCount === 1 ? "time" : "times"}
              </Meta>
            )}
          </dl>
        </div>

        <footer className="flex flex-col gap-2 border-t border-line px-5 py-4">
          <Link href={`/issues/${issue.id}`} className={buttonClasses({ variant: "secondary" })}>
            Open issue page
          </Link>
        </footer>
      </aside>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="eyebrow text-ink-faint">{label}</dt>
      <dd className="mt-1 font-mono text-[0.8125rem] text-ink">{children}</dd>
    </div>
  );
}
