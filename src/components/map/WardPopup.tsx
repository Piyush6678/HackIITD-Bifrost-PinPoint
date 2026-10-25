"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatPercent } from "@/lib/format";
import { Councillor } from "../scorecard/Councillor";
import type { WardCard } from "../scorecard/WardScorecard";
import { Skeleton } from "../ui/Skeleton";

// What a resident wants to know about a ward at a glance: who answers for it and how it's doing.
export function WardPopup({ number, name }: { number: number; name: string }) {
  const [card, setCard] = useState<WardCard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api<WardCard>(`/api/scorecard/${number}`, { signal: controller.signal })
      .then(setCard)
      .catch((err) => {
        if (!controller.signal.aborted) setError(err instanceof ApiError ? err.message : "Couldn't load this ward");
      });
    return () => controller.abort();
  }, [number]);

  const officer = card?.officers.find((o) => o.current);
  const m = card?.metrics;

  return (
    <div className="w-64">
      <p className="eyebrow text-ink-faint">Ward {number}{card ? ` · ${card.ward.zone} zone` : ""}</p>
      <p className="mt-0.5 font-serif text-base font-bold leading-snug text-ink">{name}</p>

      {error && <p className="mt-2 text-xs text-brick">{error}</p>}

      {!card && !error && (
        <div role="status" aria-label="Loading" className="mt-3 flex flex-col gap-2">
          <Skeleton className="h-3.5 w-4/5" />
          <Skeleton className="h-3.5 w-3/5" />
          <Skeleton className="mt-1 h-10 w-full" />
        </div>
      )}

      {card && m && (
        <>
          <dl className="mt-2.5 flex flex-col gap-1.5">
            <div>
              <dt className="text-[0.6875rem] font-bold text-ink-faint">Councillor</dt>
              <dd>
                <Councillor councillor={card.councillor} compact />
              </dd>
            </div>
            <div>
              <dt className="text-[0.6875rem] font-bold text-ink-faint">Ward officer</dt>
              <dd className="text-xs text-ink-soft">
                {officer ? (
                  <>
                    <span className="font-bold text-ink">{officer.name}</span>
                    {officer.designation && <span className="text-ink-faint"> · {officer.designation}</span>}
                  </>
                ) : (
                  "Not assigned yet"
                )}
              </dd>
            </div>
          </dl>

          <dl className="mt-3 grid grid-cols-4 gap-1 border-t border-line pt-2.5 text-center">
            <Figure label="Open" value={m.open} />
            <Figure label="Overdue" value={m.overdue} tone={m.overdue > 0 ? "text-brick" : undefined} />
            <Figure label="Resolved" value={m.resolved} />
            <Figure label="Accepted" value={formatPercent(m.acceptanceRate)} />
          </dl>

          <Link href={`/scorecard/${number}`} className="mt-3 block text-right text-xs font-bold text-brand hover:underline">
            Ward scorecard →
          </Link>
        </>
      )}
    </div>
  );
}

function Figure({ label, value, tone = "text-ink" }: { label: string; value: number | string; tone?: string }) {
  return (
    // dt first in the markup; the number still reads on top.
    <div className="flex flex-col-reverse">
      <dt className="text-[0.625rem] font-bold text-ink-faint">{label}</dt>
      <dd className={`font-mono text-sm font-medium ${tone}`}>{value}</dd>
    </div>
  );
}
