type Props = {
  size?: number;
  withWordmark?: boolean;
  tone?: "light" | "dark";
};

// The ring from the deck: a pin seen from above.
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className={className}>
      <circle cx="16" cy="16" r="11.5" fill="none" stroke="var(--color-mint)" strokeWidth="9" />
    </svg>
  );
}

export function Logo({ size = 28, withWordmark = true, tone = "light" }: Props) {
  const text = tone === "light" ? "text-white" : "text-pine";
  const sub = tone === "light" ? "text-white/60" : "text-ink-faint";

  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      {withWordmark && (
        <span className="flex items-baseline gap-3 leading-none">
          <span className={`font-serif text-[1.3rem] font-bold tracking-tight ${text}`}>PinPoint</span>
          <span className={`hidden text-[0.625rem] font-bold uppercase tracking-[0.14em] md:inline ${sub}`}>
            Report · Track · Resolve
          </span>
        </span>
      )}
    </span>
  );
}
