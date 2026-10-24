import Link from "next/link";
import { CategoryIcon } from "@/components/issue/CategoryIcon";
import { StatusPill } from "@/components/issue/StatusPill";
import { CATEGORY_LABELS, timeAgo } from "@/lib/format";
import type { PublicIssue } from "@/lib/serialize";

export function IssuePopup({ issue }: { issue: PublicIssue }) {
  return (
    <div className="w-60">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-ink-soft">
          <CategoryIcon category={issue.category} className="size-4" />
          {CATEGORY_LABELS[issue.category]}
        </span>
        <StatusPill status={issue.status} size="sm" />
      </div>

      <p className="mt-2 font-serif text-base font-bold leading-snug text-ink">{issue.title}</p>

      <p className="mt-1.5 font-mono text-[0.6875rem] text-ink-faint">
        {issue.ward?.number ? `Ward ${issue.ward.number} · ` : ""}
        {timeAgo(issue.createdAt)}
      </p>

      <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
        <span className="text-xs text-ink-soft">
          <strong className="text-ink">{issue.upvoteCount}</strong>{" "}
          {issue.upvoteCount === 1 ? "person affected" : "people affected"}
        </span>
        <div className="flex flex-col items-end gap-1">
          <Link href={`/issues/${issue.id}`} className="text-xs font-bold text-brand hover:underline">
            View issue →
          </Link>
          {issue.status === "pending_verification" && (
            <Link href={`/issues/${issue.id}`} className="text-xs font-bold text-status-pending hover:underline">
              Check this fix
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
