import { STATUS_LABELS, type Status } from "@/lib/constants";

// Spelled out in full so Tailwind can see every class at build time.
export const STATUS_TONE: Record<Status, { dot: string; pill: string }> = {
  open: { dot: "bg-status-open", pill: "bg-status-open/10 text-status-open" },
  in_progress: { dot: "bg-status-progress", pill: "bg-status-progress/12 text-[#9a5c12]" },
  pending_verification: { dot: "bg-status-pending", pill: "bg-status-pending/10 text-status-pending" },
  resolved: { dot: "bg-status-resolved", pill: "bg-status-resolved/12 text-brand" },
};

export function StatusDot({ status, className = "size-2" }: { status: Status; className?: string }) {
  return <span aria-hidden className={`inline-block shrink-0 rounded-full ${STATUS_TONE[status].dot} ${className}`} />;
}

export function StatusPill({ status, size = "md" }: { status: Status; size?: "md" | "sm" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold ${STATUS_TONE[status].pill} ${
        size === "sm" ? "px-2 py-0.5 text-[0.6875rem]" : "px-2.5 py-1 text-xs"
      }`}
    >
      <StatusDot status={status} className={size === "sm" ? "size-1.5" : "size-2"} />
      {STATUS_LABELS[status]}
    </span>
  );
}
