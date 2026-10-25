import type { ReactNode } from "react";
import { MIN_SAMPLES } from "@/lib/scorecard";

// One number on a scorecard, with what it means underneath.
export function Stat({ label, value, note, tone = "text-ink" }: { label: string; value: ReactNode; note?: string; tone?: string }) {
  return (
    <div className="rounded-card border border-line bg-white px-4 py-3.5">
      <dt className="eyebrow text-ink-faint">{label}</dt>
      <dd className={`mt-1.5 font-serif text-2xl font-bold leading-none ${tone}`}>{value}</dd>
      {note && <dd className="mt-1.5 text-xs leading-snug text-ink-soft">{note}</dd>}
    </div>
  );
}

// Share of judged fixes residents accepted, as a bar. Empty until there's enough data.
export function AcceptanceBar({ rate }: { rate: number | null }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-mist" aria-hidden>
      {rate !== null && (
        <div
          className={`h-full rounded-full ${rate >= 70 ? "bg-mint" : rate >= 40 ? "bg-amber" : "bg-brick"}`}
          style={{ width: `${Math.max(rate, 3)}%` }}
        />
      )}
    </div>
  );
}

export function SampleNote() {
  return (
    <p className="mt-8 border-t border-line pt-4 text-xs leading-relaxed text-ink-faint">
      Everything here is worked out from the same public records shown on each issue page. A fix counts as accepted
      only when residents nearby confirm it. Rates and medians show a dash until there are at least {MIN_SAMPLES} to go
      on, so one lucky or unlucky fix doesn&apos;t define a ward.
    </p>
  );
}
