import type { ReactNode } from "react";

type Props = {
  eyebrow: string;
  title: string;
  intro: string;
  points: string[];
  children: ReactNode;
};

export function AuthLayout({ eyebrow, title, intro, points, children }: Props) {
  return (
    <div className="mx-auto grid w-full max-w-5xl flex-1 content-center gap-10 px-4 py-10 md:grid-cols-[1fr_420px] md:gap-16 md:px-6 md:py-16">
      {/* On phones the form comes first; the pitch is for people who scroll. */}
      <div className="order-2 md:order-1 md:self-center">
        <p className="eyebrow text-brand">{eyebrow}</p>
        <h1 className="mt-3 font-serif text-[1.9rem] font-bold leading-[1.12] tracking-tight text-ink md:text-[2.4rem]">
          {title}
        </h1>
        <p className="mt-4 max-w-md leading-relaxed text-ink-soft">{intro}</p>
        <ul className="mt-7 space-y-3">
          {points.map((point) => (
            <li key={point} className="flex items-center gap-3 text-[0.9375rem] text-ink">
              <span className="grid size-5 place-items-center rounded-full bg-mint/15 text-brand">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="size-3" aria-hidden>
                  <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="order-1 rounded-card border border-line bg-white p-6 shadow-card md:order-2 md:p-8">
        {children}
      </div>
    </div>
  );
}
