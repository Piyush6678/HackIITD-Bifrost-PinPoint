import { StatusDot } from "@/components/issue/StatusPill";
import { STATUSES, STATUS_LABELS } from "@/lib/constants";

const STEPS = [
  { title: "Report once", body: "a photo and a pin. We suggest the details; you have the final say." },
  { title: "Never duplicate", body: "if it's already open within 50 m, you add your voice instead." },
  { title: "Prove the fix", body: "the ward can't close its own ticket. Neighbours confirm it." },
];

export default function HomePage() {
  return (
    <div className="grid w-full flex-1 md:h-[calc(100dvh-4rem)] md:flex-none md:grid-cols-[380px_1fr] md:grid-rows-[minmax(0,1fr)] lg:grid-cols-[420px_1fr]">
      <section className="order-2 border-line bg-white px-5 py-6 md:order-1 md:overflow-y-auto md:border-r md:px-7 md:py-7 md:scrollbar-thin">
        <p className="eyebrow inline-block rounded bg-mist px-2.5 py-1.5 text-pine">Karol Bagh zone · Pilot</p>
        <h1 className="mt-4 font-serif text-[1.85rem] font-bold leading-[1.1] tracking-tight text-ink md:text-[2rem]">
          Every civic problem, on one public map.
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
          Potholes, garbage, broken streetlights. See what&apos;s already reported near you, add yours in under a
          minute, and follow it until it&apos;s fixed. No account needed to look.
        </p>

        <ol className="mt-6 space-y-3.5">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3.5">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-pine text-xs font-bold text-white">
                {i + 1}
              </span>
              <p className="text-sm leading-snug text-ink-soft">
                <strong className="font-bold text-pine">{step.title}</strong> — {step.body}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-6 rounded-card bg-mist px-4 py-3.5">
          <p className="eyebrow text-ink-faint">How an issue moves</p>
          <ol className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2">
            {STATUSES.map((status) => (
              <li key={status} className="flex items-center gap-2 text-[0.8125rem] font-bold text-ink">
                <StatusDot status={status} className="size-2" />
                {STATUS_LABELS[status]}
              </li>
            ))}
          </ol>
          <p className="mt-2.5 text-xs italic text-ink-faint">Only the community can make the last move.</p>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-line pt-3.5 text-xs text-ink-faint">
          <span>Six wards in the pilot</span>
          <span className="font-mono">28.6519° N, 77.1909° E</span>
        </div>
      </section>

      <MapArea />
    </div>
  );
}

// Stand-in for the Leaflet map that replaces it in phase 5. Kept the same
// size and position so the layout doesn't shift when the real map arrives.
function MapArea() {
  return (
    <section
      aria-label="Map"
      className="relative order-1 min-h-[42vh] overflow-hidden bg-[#e4ece9] md:order-2 md:min-h-0"
    >
      <svg className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <pattern id="blocks" width="120" height="90" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
            <rect width="120" height="90" fill="#e4ece9" />
            <rect x="8" y="8" width="104" height="74" rx="3" fill="#edf2f0" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#blocks)" />
        <path d="M-50 380 C 300 330, 600 460, 1600 300" stroke="#fff" strokeWidth="18" fill="none" />
        <path d="M640 -40 L 520 1200" stroke="#fff" strokeWidth="12" fill="none" />
      </svg>

      <div className="absolute inset-0 grid place-items-center p-6">
        <div className="max-w-xs text-balance rounded-card bg-white/95 px-5 py-4 text-center shadow-card">
          <p className="eyebrow text-brand">Live map</p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
            Issues across the six pilot wards will appear here.
          </p>
        </div>
      </div>
    </section>
  );
}
