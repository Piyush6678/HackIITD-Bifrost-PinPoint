import { SEVERITY_LABELS } from "@/lib/format";

type Props = {
  value: number;
  onChange: (severity: number) => void;
  error?: string;
};

export function SeverityPicker({ value, onChange, error }: Props) {
  return (
    <fieldset aria-describedby={error ? "severity-msg" : undefined}>
      <legend className="text-[0.8125rem] font-bold text-ink">How serious is it?</legend>
      <div className="mt-1.5 grid grid-cols-5 gap-2">
        {SEVERITY_LABELS.map((label, i) => {
          const level = i + 1;
          const selected = value === level;
          return (
            <button
              key={label}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(level)}
              className={`flex flex-col items-center rounded-md border px-1 py-2 transition-colors ${
                selected ? "border-pine bg-pine text-white" : "border-line bg-white text-ink hover:border-pine/40"
              }`}
            >
              <span className="font-mono text-base">{level}</span>
              <span className="mt-0.5 text-[0.6875rem] font-bold">{label}</span>
            </button>
          );
        })}
      </div>
      {error && (
        <p id="severity-msg" className="mt-1.5 text-xs text-brick">
          {error}
        </p>
      )}
    </fieldset>
  );
}
