"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import { formatDays, formatPercent, timeAgo } from "@/lib/format";
import type { Metrics } from "@/lib/scorecard";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Chip } from "../ui/Chip";
import { Skeleton } from "../ui/Skeleton";
import { AcceptanceBar, SampleNote, Stat } from "./Stat";

type Sort = "acceptance" | "speed" | "overdue";

type Row = { ward: { number: number; name: string; zone: string }; metrics: Metrics };
type Data = { generatedAt: string; sort: Sort; wards: Row[]; city: Metrics };

const SORTS: { value: Sort; label: string }[] = [
  { value: "acceptance", label: "Fixes accepted" },
  { value: "speed", label: "Fastest fixes" },
  { value: "overdue", label: "Most overdue" },
];

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: Data };

export function CityScorecard() {
  const [sort, setSort] = useState<Sort>("acceptance");
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api<Data>(`/api/scorecard?sort=${sort}`, { signal: controller.signal })
      .then((data) => setState({ status: "ready", data }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", message: err instanceof ApiError ? err.message : "Couldn't load the scorecard" });
      });
    return () => controller.abort();
  }, [sort, attempt]);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:py-10">
      <p className="eyebrow text-ink-faint">Scorecard</p>
      <h1 className="mt-1 font-serif text-[1.75rem] font-bold leading-tight text-ink md:text-4xl">
        How each ward is doing
      </h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Ward officers mark problems fixed; residents nearby decide whether they really are. These numbers come from
        those decisions, not from the officers&apos; own reports.
      </p>

      {state.status === "error" && (
        <div className="mt-6">
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
        </div>
      )}

      {state.status === "loading" && <CitySkeleton />}

      {state.status === "ready" && (
        <>
          <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="Fixes accepted"
              value={formatPercent(state.data.city.acceptanceRate)}
              note={`${state.data.city.failedChecks} rejected by residents`}
            />
            <Stat
              label="Median time to fix"
              value={formatDays(state.data.city.medianDaysToFix)}
              note="From report to residents confirming"
            />
            <Stat
              label="Resolved"
              value={state.data.city.resolved}
              note={`of ${state.data.city.reported} reported`}
            />
            <Stat
              label="Overdue now"
              value={state.data.city.overdue}
              tone={state.data.city.overdue > 0 ? "text-brick" : "text-ink"}
              note="Past the fix target for their category"
            />
          </dl>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-xl font-bold text-ink">Pilot wards</h2>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Sort wards by">
              {SORTS.map((s) => (
                <Chip key={s.value} label={s.label} selected={sort === s.value} onClick={() => setSort(s.value)} />
              ))}
            </div>
          </div>

          <ol className="mt-4 flex flex-col gap-2.5">
            {state.data.wards.map((row, i) => (
              <li key={row.ward.number}>
                <WardRow row={row} rank={i + 1} />
              </li>
            ))}
          </ol>

          <p className="mt-3 font-mono text-xs text-ink-faint">Updated {timeAgo(state.data.generatedAt)}</p>
          <SampleNote />
        </>
      )}
    </div>
  );
}

function WardRow({ row, rank }: { row: Row; rank: number }) {
  const { ward, metrics: m } = row;
  return (
    <Link
      href={`/scorecard/${ward.number}`}
      className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3 rounded-card border border-line bg-white px-4 py-3.5 transition-colors hover:border-pine/40 md:grid-cols-[2rem_minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]"
    >
      <span className="font-mono text-sm text-ink-faint">{rank}</span>
      <div className="min-w-0">
        <p className="truncate font-serif text-base font-bold text-ink">
          Ward {ward.number} · {ward.name}
        </p>
        <p className="text-xs text-ink-faint">{ward.zone} zone</p>
      </div>

      <dl className="col-span-2 grid grid-cols-4 gap-3 md:col-span-4 md:contents">
        <Cell label="Accepted">
          {formatPercent(m.acceptanceRate)}
          <div className="mt-1.5 w-full max-w-24">
            <AcceptanceBar rate={m.acceptanceRate} />
          </div>
        </Cell>
        <Cell label="To fix">{formatDays(m.medianDaysToFix)}</Cell>
        <Cell label="Resolved">
          {m.resolved}
          <span className="font-normal text-ink-faint">/{m.reported}</span>
        </Cell>
        <Cell label="Overdue" tone={m.overdue > 0 ? "text-brick" : "text-ink"}>
          {m.overdue}
        </Cell>
      </dl>
    </Link>
  );
}

function Cell({ label, tone = "text-ink", children }: { label: string; tone?: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.6875rem] font-bold text-ink-faint">{label}</dt>
      <dd className={`mt-0.5 font-mono text-sm font-medium ${tone}`}>{children}</dd>
    </div>
  );
}

function CitySkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-card" />
        ))}
      </div>
      <div className="mt-10 flex flex-col gap-2.5">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-16 rounded-card" />
        ))}
      </div>
    </div>
  );
}
