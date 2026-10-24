import type { ReactNode } from "react";

const TONES = {
  error: "border-brick/25 bg-brick/8 text-brick",
  info: "border-cobalt/25 bg-cobalt/8 text-cobalt",
};

export function Alert({ tone = "error", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex gap-2.5 rounded-md border px-3.5 py-3 text-sm ${TONES[tone]}`}>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-px size-4 shrink-0" aria-hidden>
        <circle cx="10" cy="10" r="7.5" />
        <path d="M10 6.5v4.5M10 13.5v.01" strokeLinecap="round" />
      </svg>
      <div>{children}</div>
    </div>
  );
}
