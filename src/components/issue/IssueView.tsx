"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import { CATEGORY_LABELS, formatCoords, formatDate, timeAgo } from "@/lib/format";
import type { serializeIssueDetail } from "@/lib/serialize";
import { IssueMiniMap } from "../map/IssueMiniMap";
import { Alert } from "../ui/Alert";
import { Button, buttonClasses } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Skeleton } from "../ui/Skeleton";
import { CategoryIcon } from "./CategoryIcon";
import { CopyLinkButton } from "./CopyLinkButton";
import { SeverityMeter } from "./SeverityMeter";
import { StatusPill } from "./StatusPill";
import { StatusTimeline } from "./StatusTimeline";
import { UpvoteButton } from "./UpvoteButton";

type IssueDetail = ReturnType<typeof serializeIssueDetail>;

type State =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; issue: IssueDetail };

async function fetchIssue(id: string): Promise<State> {
  try {
    const { issue } = await api<{ issue: IssueDetail }>(`/api/issues/${id}`);
    return { status: "ready", issue };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) return { status: "missing" };
    return { status: "error", message: err instanceof ApiError ? err.message : "Something went wrong" };
  }
}

export function IssueView() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<State>({ status: "loading" });

  // Bumped by "Try again" to re-run the fetch effect.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchIssue(id).then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  function retry() {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }

  if (state.status === "loading") return <IssueSkeleton />;

  if (state.status === "missing") {
    return (
      <Shell>
        <EmptyState
          title="We couldn't find that issue"
          action={
            <Link href="/" className={buttonClasses()}>
              Back to the map
            </Link>
          }
        >
          It may have been removed, or the link is incomplete.
        </EmptyState>
      </Shell>
    );
  }

  if (state.status === "error") {
    return (
      <Shell>
        <Alert>{state.message}</Alert>
        <Button variant="secondary" className="mt-4" onClick={retry}>
          Try again
        </Button>
      </Shell>
    );
  }

  const { issue } = state;

  function onUpvote(next: { count: number; hasUpvoted: boolean }) {
    setState({ status: "ready", issue: { ...issue, upvoteCount: next.count, hasUpvoted: next.hasUpvoted } });
  }

  return (
    <Shell>
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline">
        <span aria-hidden>←</span> Back to the map
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="flex items-center gap-1.5 text-sm font-bold text-ink-soft">
              <CategoryIcon category={issue.category} className="size-5" />
              {CATEGORY_LABELS[issue.category]}
            </span>
            <StatusPill status={issue.status} />
          </div>

          <h1 className="mt-3 font-serif text-[1.75rem] font-bold leading-tight tracking-tight text-ink md:text-4xl">
            {issue.title}
          </h1>

          <SeverityMeter value={issue.severity} className="mt-3" />

          {issue.reopenCount > 0 && (
            <div className="mt-4">
              <Alert tone="info">
                {issue.reopenCount === 1
                  ? "A fix was reported for this before, but the problem came back."
                  : `Fixes were reported ${issue.reopenCount} times before, but the problem came back.`}
              </Alert>
            </div>
          )}

          {issue.photoUrl && (
            <div className="relative mt-5 aspect-4/3 overflow-hidden rounded-card border border-line bg-mist">
              <Image
                src={issue.photoUrl}
                alt={`Photo of the reported problem: ${issue.title}`}
                fill
                unoptimized
                priority
                sizes="(min-width: 1024px) 640px, 100vw"
                className="object-cover"
              />
            </div>
          )}

          {issue.description && (
            <p className="mt-5 whitespace-pre-line text-[0.9375rem] leading-relaxed text-ink-soft">
              {issue.description}
            </p>
          )}

          <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 rounded-card bg-mist px-4 py-4 sm:grid-cols-2">
            <Meta label="Coordinates">{formatCoords(issue.location, 5)}</Meta>
            <Meta label="Ward">
              {issue.ward?.number
                ? `Ward ${issue.ward.number}${issue.ward.name ? ` · ${issue.ward.name}` : ""}`
                : "Not assigned"}
            </Meta>
            {issue.address && <Meta label="Address">{issue.address}</Meta>}
            <Meta label="Reported">
              {formatDate(issue.createdAt)} · {timeAgo(issue.createdAt)}
            </Meta>
            <Meta label="Handled by">{issue.department}</Meta>
            {issue.status !== "resolved" && (
              <Meta label={issue.overdue ? "Overdue since" : "Fix due by"}>
                <span className={issue.overdue ? "text-brick" : undefined}>{formatDate(issue.dueAt)}</span>
              </Meta>
            )}
            {issue.portal && <Meta label={issue.portal.name}>{issue.portal.ticketId ?? "Filed, awaiting ticket"}</Meta>}
          </dl>

          <section className="mt-6" aria-label="Location">
            <IssueMiniMap issue={issue} />
          </section>
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-card border border-line bg-white p-4 shadow-card">
            <UpvoteButton
              issueId={issue.id}
              count={issue.upvoteCount}
              hasUpvoted={issue.hasUpvoted}
              status={issue.status}
              onChange={onUpvote}
            />
            <div className="mt-4 border-t border-line pt-3">
              <CopyLinkButton />
            </div>
          </div>

          <div className="rounded-card border border-line bg-white p-4">
            <h2 className="eyebrow mb-4 text-ink-faint">Status history</h2>
            <StatusTimeline history={issue.statusHistory} />
          </div>
        </aside>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-6 md:py-8">{children}</div>;
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="eyebrow text-ink-faint">{label}</dt>
      <dd className="mt-1 wrap-break-word font-mono text-[0.8125rem] text-ink">{children}</dd>
    </div>
  );
}

export function IssueSkeleton() {
  return (
    <Shell>
      <div role="status" aria-label="Loading issue">
        <Skeleton className="h-4 w-28" />
        <div className="mt-6 flex gap-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="mt-4 h-9 w-3/4" />
        <Skeleton className="mt-6 aspect-4/3 w-full rounded-card" />
        <Skeleton className="mt-5 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-2/3" />
      </div>
    </Shell>
  );
}
