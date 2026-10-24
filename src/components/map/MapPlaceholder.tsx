// Drawn while Leaflet loads, so the map area never flashes empty.
export function MapPlaceholder() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#e4ece9]" role="status" aria-label="Loading map">
      <svg className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <pattern id="blocks" width="120" height="90" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
            <rect width="120" height="90" fill="#e4ece9" />
            <rect x="8" y="8" width="104" height="74" rx="3" fill="#edf2f0" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#blocks)" />
      </svg>
      <p className="eyebrow absolute inset-x-0 top-1/2 -translate-y-1/2 animate-pulse text-center text-ink-faint">
        Loading map
      </p>
    </div>
  );
}
