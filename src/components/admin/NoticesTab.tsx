"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { CATEGORY_LABELS, formatDate } from "@/lib/format";
import type { PublicNotice } from "@/lib/notices";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Chip } from "../ui/Chip";
import { EmptyState } from "../ui/EmptyState";
import { Skeleton } from "../ui/Skeleton";

type Filter = "pending" | "approved";

export function NoticesTab() {
  const [filter, setFilter] = useState<Filter>("pending");
  const [state, setState] = useState<{ filter: Filter; notices?: PublicNotice[]; error?: string } | null>(null);

  // Bumped after approving or discarding, to ask the server again.
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    api<{ notices: PublicNotice[] }>(`/api/admin/notices?status=${filter}`)
      .then(({ notices }) => !cancelled && setState({ filter, notices }))
      .catch(
        (err) =>
          !cancelled && setState({ filter, error: err instanceof ApiError ? err.message : "Couldn't load the notices." }),
      );
    return () => {
      cancelled = true;
    };
  }, [filter, attempt]);

  const current = state?.filter === filter ? state : null;

  return (
    <div>
      <p className="text-sm text-ink-soft">
        Announcements TinyFish found on official sites that name a pilot ward. Nothing is shown to the public until you approve it.
      </p>
      <div className="mt-4 flex gap-2">
        <Chip label="Waiting" selected={filter === "pending"} onClick={() => setFilter("pending")} />
        <Chip label="Approved" selected={filter === "approved"} onClick={() => setFilter("approved")} />
      </div>

      <div className="mt-4">
        {current?.error ? (
          <div className="flex flex-col items-start gap-3">
            <Alert>{current.error}</Alert>
            <Button variant="secondary" onClick={reload}>
              Try again
            </Button>
          </div>
        ) : !current?.notices ? (
          <div role="status" aria-label="Loading" className="flex flex-col gap-3">
            <Skeleton className="h-24 w-full rounded-card" />
            <Skeleton className="h-24 w-full rounded-card" />
          </div>
        ) : current.notices.length === 0 ? (
          <EmptyState title="Nothing here">
            {filter === "pending"
              ? "New notices show up here after a monitor finds one that names a pilot ward."
              : "No notices are public yet."}
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {current.notices.map((n) => (
              <li key={n.id}>
                <NoticeCard notice={n} onChanged={reload} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function NoticeCard({ notice: n, onChanged }: { notice: PublicNotice; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(method: "PATCH" | "DELETE", json?: unknown) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/notices/${n.id}`, { method, json });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <article className="rounded-card border border-amber/30 bg-amber/8 p-4">
      <a href={n.url} target="_blank" rel="noreferrer" className="font-bold leading-snug text-ink hover:underline">
        {n.title}
      </a>
      {n.summary && <p className="mt-1 text-sm text-ink-soft">{n.summary}</p>}
      <p className="mt-1.5 font-mono text-[0.6875rem] text-ink-faint">
        {n.source} · fetched {formatDate(n.fetchedAt)}
        {n.publishedAt && ` · published ${formatDate(n.publishedAt)}`}
      </p>
      <p className="mt-2 flex flex-wrap gap-1.5 text-xs">
        {n.wards.map((w) => (
          <span key={w.id} className="rounded-full bg-white px-2 py-0.5 font-bold text-ink">
            Ward {w.number} · {w.name}
          </span>
        ))}
        {n.categories.length === 0 ? (
          <span className="rounded-full bg-white px-2 py-0.5 text-ink-soft">All kinds of issue</span>
        ) : (
          n.categories.map((c) => (
            <span key={c} className="rounded-full bg-white px-2 py-0.5 text-ink-soft">
              {CATEGORY_LABELS[c]}
            </span>
          ))
        )}
      </p>

      {error && (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      )}
      <div className="mt-3 flex gap-2">
        {n.approved ? (
          <Button size="sm" variant="secondary" loading={busy} onClick={() => send("PATCH", { approved: false })}>
            Take down
          </Button>
        ) : (
          <>
            <Button size="sm" loading={busy} onClick={() => send("PATCH", { approved: true })}>
              Approve
            </Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => send("DELETE")}>
              Discard
            </Button>
          </>
        )}
      </div>
    </article>
  );
}
