import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<"button">, "children"> & {
  label: string;
  selected?: boolean;
  count?: number;
  // A Tailwind bg-* class for the leading dot, e.g. a category colour.
  dot?: string;
};

export function Chip({ label, selected = false, count, dot, className = "", ...rest }: Props) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`inline-flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-[0.8125rem] font-bold transition-colors ${
        selected
          ? "border-pine bg-pine text-white"
          : "border-line bg-white text-ink hover:border-pine/40"
      } ${className}`}
      {...rest}
    >
      {dot && <span className={`size-2 rounded-full ${dot} ${selected ? "ring-2 ring-white/70" : ""}`} />}
      {label}
      {count !== undefined && (
        <span className={`font-mono text-[0.6875rem] font-normal ${selected ? "text-white/70" : "text-ink-faint"}`}>
          {count}
        </span>
      )}
    </button>
  );
}
