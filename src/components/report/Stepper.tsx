const STEPS = ["Photo", "Location", "Details"];

export function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Report progress">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2 last:flex-none" aria-current={active ? "step" : undefined}>
            <span
              className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                done ? "bg-mint text-white" : active ? "bg-pine text-white" : "border border-line bg-white text-ink-faint"
              }`}
            >
              {done ? (
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" className="size-3" aria-hidden>
                  <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <span className={`text-sm font-bold ${active ? "text-pine" : done ? "text-ink" : "text-ink-faint"}`}>
              {label}
              {done && <span className="sr-only"> (done)</span>}
            </span>
            {i < STEPS.length - 1 && <span aria-hidden className={`h-px flex-1 ${done ? "bg-mint" : "bg-line"}`} />}
          </li>
        );
      })}
    </ol>
  );
}
