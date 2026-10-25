"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import { CATEGORY_LABELS, formatDate, formatDays, formatPercent, timeAgo } from "@/lib/format";
import type { Metrics, OfficerMetrics } from "@/lib/scorecard";
import type { PublicIssue } from "@/lib/serialize";
import { CategoryIcon } from "../issue/CategoryIcon";
import { Alert } from "../ui/Alert";
import { Button, buttonClasses } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Skeleton } from "../ui/Skeleton";
import { Councillor } from "./Councillor";
import { AcceptanceBar, SampleNote, Stat } from "./Stat";

type Officer = { name: string; designation: string | null; current: boolean; metrics: OfficerMetrics };

export type WardCard = {
  ward: { number: number; name: string; zone: string };
  councillor: { name: string; role: string; source: string | null } | null;
  generatedAt: string;
  metrics: Metrics;
  officers: Officer[];
  recentFixes: (PublicIssue & { daysToFix: number })[];
  overdue: (PublicIssue & { daysOverdue: number; department: string })[];
};

type State =
  | { status: "loading" }
  | { status: "missing"; message: string }
  | { status: "error"; message: string }
  | { status: "ready"; data: WardCard };

export function WardScorecard() {
  const { ward } = useParams<{ ward: string }>();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api<WardCard>(`/api/scorecard/${encodeURIComponent(ward)}`, { signal: controller.signal })
      .then((data) => setState({ status: "ready", data }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && err.status === 404) setState({ status: "missing", message: err.message });
        else setState({ status: "error", message: err instanceof ApiError ? err.message : "Couldn't load this ward" });
      });
    return () => controller.abort();
  }, [ward, attempt]);

  if (state.status === "loading") return <WardSkeleton />;

  if (state.status === "missing") {
    return (
      <Shell>
        <EmptyState
          title="We don't have that ward"
          action={
            <Link href="/scorecard" className={buttonClasses()}>
              See all wards
            </Link>
          }
        >
          {state.message}.
        </EmptyState>
      </Shell>
    );
  }

  if (state.status === "error") {
    return (
      <Shell>
        <Alert>{state.message}</Alert>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => {
            setState({ status: "loading" });
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </Button>
      </Shell>
    );
  }

  const { data } = state;
  const m = data.metrics;

  return (
    <Shell>
      <p className="eyebrow text-ink-faint">{data.ward.zone} zone · scorecard</p>
      <h1 className="mt-1 font-serif text-[1.75rem] font-bold leading-tight text-ink md:text-4xl">
        Ward {data.ward.number} · {data.ward.name}
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        {m.reported} reported · {m.resolved} resolved · {m.open} still open
      </p>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-2 rounded-md bg-mist px-3 py-2">
        <span className="eyebrow text-ink-faint">Councillor</span>
        <Councillor councillor={data.councillor} />
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Fixes accepted" value={formatPercent(m.acceptanceRate)} note="Share residents confirmed" />
        <Stat label="Median time to fix" value={formatDays(m.medianDaysToFix)} note="From report to confirmed fix" />
        <Stat
          label="First response"
          value={formatDays(m.medianDaysToFirstAction)}
          note="Median wait before work started"
        />
        <Stat
          label="Overdue now"
          value={m.overdue}
          tone={m.overdue > 0 ? "text-brick" : "text-ink"}
          note="Past the category's fix target"
        />
        <Stat
          label="Fixes rejected"
          value={m.failedChecks}
          tone={m.failedChecks > 0 ? "text-brick" : "text-ink"}
          note="Residents said it wasn't fixed"
        />
        <Stat label="Came back" value={m.cameBack} note="Reported again soon after a fix" />
      </dl>

      <Section title="Officers">
        {data.officers.length === 0 ? (
          <p className="text-sm text-ink-soft">No officer has been assigned to this ward or posted a fix here yet.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {data.officers.map((o, i) => (
              <li key={`${o.name}-${i}`}>
                <OfficerCard officer={o} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Overdue now" count={data.overdue.length}>
        {data.overdue.length === 0 ? (
          <p className="text-sm text-ink-soft">Nothing in this ward is past its fix target.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.overdue.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                detail={`${issue.department} · due ${formatDate(issue.dueAt)}`}
                figure={`${issue.daysOverdue} ${issue.daysOverdue === 1 ? "day" : "days"} late`}
                tone="text-brick"
              />
            ))}
          </ul>
        )}
      </Section>

      <Section title="Recently verified by residents">
        {data.recentFixes.length === 0 ? (
          <p className="text-sm text-ink-soft">No fix here has been confirmed by residents yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.recentFixes.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                detail={`Confirmed ${timeAgo(issue.resolvedAt!)}`}
                figure={`fixed in ${formatDays(issue.daysToFix)}`}
                tone="text-ink-soft"
              />
            ))}
          </ul>
        )}
      </Section>

      <p className="mt-6 font-mono text-xs text-ink-faint">Updated {timeAgo(data.generatedAt)}</p>
      <SampleNote />
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 md:py-10">
      <Link href="/scorecard" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline">
        <span aria-hidden>←</span> All wards
      </Link>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="mb-3 flex items-baseline gap-2 font-serif text-xl font-bold text-ink">
        {title}
        {count !== undefined && count > 0 && <span className="font-mono text-sm font-normal text-ink-faint">{count}</span>}
      </h2>
      {children}
    </section>
  );
}

function OfficerCard({ officer }: { officer: Officer }) {
  const m = officer.metrics;
  return (
    <div className="h-full rounded-card border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-serif text-base font-bold text-ink">{officer.name}</p>
          {officer.designation && <p className="truncate text-xs text-ink-soft">{officer.designation}</p>}
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-bold ${
            officer.current ? "bg-mint/15 text-pine" : "bg-mist text-ink-faint"
          }`}
        >
          {officer.current ? "Current officer" : "Former"}
        </span>
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-3">
        <span className="font-serif text-2xl font-bold leading-none text-ink">{formatPercent(m.acceptanceRate)}</span>
        <span className="text-xs text-ink-faint">of judged fixes accepted</span>
      </div>
      <div className="mt-2">
        <AcceptanceBar rate={m.acceptanceRate} />
      </div>

      <dl className="mt-4 grid grid-cols-4 gap-2 border-t border-line pt-3 text-center">
        <Figure label="Posted" value={m.fixesPosted} />
        <Figure label="Accepted" value={m.verified} />
        <Figure label="Rejected" value={m.failedChecks} tone={m.failedChecks > 0 ? "text-brick" : undefined} />
        <Figure label="Waiting" value={m.waiting} />
      </dl>
      <p className="mt-3 text-xs text-ink-soft">
        Median time to fix <span className="font-mono text-ink">{formatDays(m.medianDaysToFix)}</span> · first
        response <span className="font-mono text-ink">{formatDays(m.medianDaysToFirstAction)}</span>
      </p>
    </div>
  );
}

function Figure({ label, value, tone = "text-ink" }: { label: string; value: number; tone?: string }) {
  return (
    // dt has to come first in the markup; the number still reads on top.
    <div className="flex flex-col-reverse">
      <dt className="text-[0.6875rem] font-bold text-ink-faint">{label}</dt>
      <dd className={`font-mono text-base font-medium ${tone}`}>{value}</dd>
    </div>
  );
}

function IssueRow({
  issue,
  detail,
  figure,
  tone,
}: {
  issue: PublicIssue;
  detail: string;
  figure: string;
  tone: string;
}) {
  return (
    <li>
      <Link
        href={`/issues/${issue.id}`}
        className="flex items-center gap-3 rounded-card border border-line bg-white px-3.5 py-3 transition-colors hover:border-pine/40"
      >
        <CategoryIcon category={issue.category} className="size-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">{issue.title}</p>
          <p className="truncate text-xs text-ink-faint">
            {CATEGORY_LABELS[issue.category]} · {detail}
          </p>
        </div>
        <span className={`shrink-0 font-mono text-xs ${tone}`}>{figure}</span>
      </Link>
    </li>
  );
}

export function WardSkeleton() {
  return (
    <Shell>
      <div role="status" aria-label="Loading">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-3 h-9 w-3/4" />
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-card" />
          ))}
        </div>
        <Skeleton className="mt-9 h-40 rounded-card" />
      </div>
    </Shell>
  );
}
