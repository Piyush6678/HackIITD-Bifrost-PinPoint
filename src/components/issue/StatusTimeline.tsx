import { STATUS_LABELS, type Status } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { StatusDot } from "./StatusPill";

type Entry = { status: Status; at: Date | string; note: string | null };

export function StatusTimeline({ history }: { history: Entry[] }) {
  if (history.length === 0) return null;

  return (
    <ol>
      {history.map((entry, i) => (
        <li key={`${entry.status}-${i}`} className="relative flex gap-3.5 pb-5 last:pb-0">
          {i < history.length - 1 && (
            <span aria-hidden className="absolute bottom-0 left-[0.4375rem] top-4 w-px bg-line" />
          )}
          <span className="relative mt-1 grid size-4 shrink-0 place-items-center rounded-full bg-white">
            <StatusDot status={entry.status} className="size-3" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink">{STATUS_LABELS[entry.status]}</p>
            <p className="font-mono text-[0.6875rem] text-ink-faint">{formatDateTime(entry.at)}</p>
            {entry.note && <p className="mt-1 text-sm text-ink-soft">{entry.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
