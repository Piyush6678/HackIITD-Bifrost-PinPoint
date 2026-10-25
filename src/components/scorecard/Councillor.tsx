import type { WardCard } from "./WardScorecard";

// The ward's elected councillor, with a link to where the name came from.
export function Councillor({ councillor, compact = false }: { councillor: WardCard["councillor"]; compact?: boolean }) {
  if (!councillor) {
    return <p className="text-xs text-ink-faint">Councillor not on record yet.</p>;
  }
  return (
    <p className={compact ? "text-xs text-ink-soft" : "text-sm text-ink-soft"}>
      <span className="font-bold text-ink">{councillor.name}</span>
      <span className="text-ink-faint"> · {councillor.role}</span>
      {councillor.source && (
        <>
          {" · "}
          <a href={councillor.source} target="_blank" rel="noopener noreferrer" className="font-bold text-brand hover:underline">
            Source
          </a>
        </>
      )}
    </p>
  );
}
