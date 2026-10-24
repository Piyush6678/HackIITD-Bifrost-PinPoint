export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded bg-[#e3ebe8] ${className}`} />;
}

export function Spinner({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`animate-spin ${className}`} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// Placeholder with roughly the shape of an issue card, so lists don't jump when data arrives.
export function IssueCardSkeleton() {
  return (
    <div className="rounded-card border border-line bg-white p-4" role="status" aria-label="Loading">
      <div className="flex items-start justify-between gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-14" />
      </div>
      <Skeleton className="mt-4 h-5 w-4/5" />
      <Skeleton className="mt-2 h-4 w-1/2" />
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-7 w-16 rounded-md" />
      </div>
    </div>
  );
}
