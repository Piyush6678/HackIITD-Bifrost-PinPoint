import { StatusDot } from "@/components/issue/StatusPill";
import { HomeMap } from "@/components/map/HomeMap";
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

      <section aria-label="Map" className="relative isolate order-1 h-[45vh] md:order-2 md:h-auto">
        <HomeMap />
      </section>
    </div>
  );
}
