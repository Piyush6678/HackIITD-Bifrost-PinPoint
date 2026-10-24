import { severityLabel } from "@/lib/format";

type Props = {
  value: number;
  showLabel?: boolean;
  className?: string;
};

export function SeverityMeter({ value, showLabel = true, className = "" }: Props) {
  const label = `Severity ${value} · ${severityLabel(value)}`;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div role="meter" aria-valuemin={1} aria-valuemax={5} aria-valuenow={value} aria-label={label} className="flex gap-1">
        {[1, 2, 3, 4, 5].map((step) => (
          <span
            key={step}
            className={`h-1.5 w-6 rounded-full ${step <= value ? (value >= 4 ? "bg-brick" : "bg-pine") : "bg-line"}`}
          />
        ))}
      </div>
      {showLabel && <span className="font-mono text-[0.6875rem] text-ink-soft">{label}</span>}
    </div>
  );
}
