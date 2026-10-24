"use client";

import Link from "next/link";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { CATEGORY_LABELS, formatDistance, timeAgo } from "@/lib/format";
import type { PublicIssue } from "@/lib/serialize";
import { CategoryIcon } from "../issue/CategoryIcon";
import { StatusPill } from "../issue/StatusPill";
import { Button } from "../ui/Button";

type Props = {
  issue: PublicIssue & { distance?: number };
  label?: string;
  // Called once the vote is saved (or was already there).
  onVoted?: (issue: PublicIssue) => void;
};

export function NearbyIssueCard({ issue, label = "I'm affected too", onVoted }: Props) {
  const [voted, setVoted] = useState(issue.hasUpvoted);
  const [count, setCount] = useState(issue.upvoteCount);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addVoice() {
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ upvoteCount: number; hasUpvoted: boolean }>(`/api/issues/${issue.id}/upvote`, {
        method: "POST",
      });
      setCount(result.upvoteCount);
      setVoted(true);
      onVoted?.({ ...issue, upvoteCount: result.upvoteCount, hasUpvoted: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your vote. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-card border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-xs font-bold text-ink-soft">
          <CategoryIcon category={issue.category} className="size-4" />
          {CATEGORY_LABELS[issue.category]}
        </span>
        <StatusPill status={issue.status} size="sm" />
      </div>

      <h3 className="mt-2 font-serif text-base font-bold leading-snug text-ink">{issue.title}</h3>
      <p className="mt-1 font-mono text-[0.6875rem] text-ink-faint">
        {issue.distance !== undefined && `${formatDistance(issue.distance)} away · `}
        {timeAgo(issue.createdAt)}
      </p>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className="text-xs text-ink-soft">
          <strong className="text-ink">{count}</strong> {count === 1 ? "person" : "people"} affected
        </span>
        <div className="flex items-center gap-3">
          <Link href={`/issues/${issue.id}`} className="text-xs font-bold text-brand hover:underline">
            View
          </Link>
          {voted ? (
            <span className="text-xs font-bold text-brand">Voice added</span>
          ) : (
            <Button size="sm" onClick={addVoice} loading={busy}>
              {label}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs font-bold text-brick">
          {error}
        </p>
      )}
    </article>
  );
}
