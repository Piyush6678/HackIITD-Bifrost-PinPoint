"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/hooks/useSession";
import { api, ApiError } from "@/lib/api";
import type { Status } from "@/lib/constants";
import { Button, buttonClasses } from "../ui/Button";

type Props = {
  issueId: string;
  count: number;
  hasUpvoted: boolean;
  status: Status;
  onChange?: (next: { count: number; hasUpvoted: boolean }) => void;
};

export function UpvoteButton({ issueId, count: initialCount, hasUpvoted: initialUpvoted, status, onChange }: Props) {
  const session = useSession();
  const [count, setCount] = useState(initialCount);
  const [upvoted, setUpvoted] = useState(initialUpvoted);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (busy) return;
    const previous = { count, hasUpvoted: upvoted };
    const next = { count: Math.max(0, count + (upvoted ? -1 : 1)), hasUpvoted: !upvoted };

    // Update straight away; the request only has to confirm it.
    setCount(next.count);
    setUpvoted(next.hasUpvoted);
    setBusy(true);
    setError(null);
    onChange?.(next);

    try {
      const result = await api<{ upvoteCount: number; hasUpvoted: boolean }>(`/api/issues/${issueId}/upvote`, {
        method: previous.hasUpvoted ? "DELETE" : "POST",
      });
      const confirmed = { count: result.upvoteCount, hasUpvoted: result.hasUpvoted };
      setCount(confirmed.count);
      setUpvoted(confirmed.hasUpvoted);
      onChange?.(confirmed);
    } catch (err) {
      setCount(previous.count);
      setUpvoted(previous.hasUpvoted);
      onChange?.(previous);
      setError(err instanceof ApiError ? err.message : "Couldn't save your vote. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const people = (
    <p className="text-sm text-ink-soft">
      <strong className="font-mono text-base text-ink">{count}</strong> {count === 1 ? "person" : "people"} affected
    </p>
  );

  if (status === "resolved") return <div className="flex flex-col gap-2">{people}</div>;

  return (
    <div className="flex flex-col gap-2">
      {people}

      {session.status === "anonymous" ? (
        <Link
          href={`/login?next=${encodeURIComponent(`/issues/${issueId}`)}`}
          className={buttonClasses({ variant: "secondary" })}
        >
          Log in to add your voice
        </Link>
      ) : (
        <Button
          variant={upvoted ? "secondary" : "primary"}
          onClick={toggle}
          disabled={session.status === "loading"}
          aria-pressed={upvoted}
        >
          <svg
            viewBox="0 0 24 24"
            fill={upvoted ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
            aria-hidden
          >
            <path d="M12 4 4.5 14h4.5v6h6v-6h4.5L12 4Z" />
          </svg>
          {upvoted ? "You're affected too" : "I'm affected too"}
        </Button>
      )}

      {error && (
        <p role="alert" className="text-xs font-bold text-brick">
          {error}
        </p>
      )}
    </div>
  );
}
