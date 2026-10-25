"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { ContactProposal, PublicRun } from "@/lib/contactImport";
import { formatDate } from "@/lib/format";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Skeleton, Spinner } from "../ui/Skeleton";

type Contact = {
  department: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  fetchedAt: string | null;
};

type WardRow = {
  id: string;
  number: number;
  name: string;
  zone: string;
  contacts: Contact[];
  latestRun: (PublicRun & { proposal: ContactProposal | { wardNumber: number } | null }) | null;
};

const POLL_MS = 8000;

export function WardContactsTab() {
  const [wards, setWards] = useState<WardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Bumped to ask the server again.
  const [attempt, setAttempt] = useState(0);
  const load = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    api<{ wards: WardRow[] }>("/api/admin/ward-contacts")
      .then((data) => {
        if (cancelled) return;
        setWards(data.wards);
        setError(null);
      })
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : "Couldn't load the ward contacts."));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // While TinyFish is still searching, ask again every few seconds.
  const searching = wards?.some((w) => w.latestRun?.status === "running") ?? false;
  useEffect(() => {
    if (!searching) return;
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [searching, load]);

  if (error && !wards) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert>{error}</Alert>
        <Button variant="secondary" onClick={load}>
          Try again
        </Button>
      </div>
    );
  }
  if (!wards) {
    return (
      <div role="status" aria-label="Loading" className="flex flex-col gap-3">
        <Skeleton className="h-32 w-full rounded-card" />
        <Skeleton className="h-32 w-full rounded-card" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-soft">
        Councillors and RTI officers for the escalation drafts. &ldquo;Refresh from MCD&rdquo; sends a TinyFish agent to MCD&apos;s own
        pages. What it finds is shown here first, and nothing is saved until you accept it.
      </p>
      {wards.map((w) => (
        <WardCard key={w.id} ward={w} onChanged={load} />
      ))}
    </div>
  );
}

function WardCard({ ward, onChanged }: { ward: WardRow; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = ward.latestRun;
  const proposal = run?.status === "needs_review" ? (run.proposal as ContactProposal) : null;

  async function act(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      await api(path, { method: "POST", json: body });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-card border border-line bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
        <h2 className="font-bold text-ink">
          Ward {ward.number} · {ward.name}
        </h2>
        <Button
          size="sm"
          variant="secondary"
          loading={busy || run?.status === "running"}
          disabled={proposal !== null}
          onClick={() => act("/api/admin/ward-contacts/refresh", { ward: ward.number })}
        >
          {run?.status === "running" ? "Searching MCD's pages…" : "Refresh from MCD"}
        </Button>
      </header>

      <div className="px-5 py-4">
        {error && (
          <div className="mb-3">
            <Alert>{error}</Alert>
          </div>
        )}

        {ward.contacts.length === 0 ? (
          <p className="text-sm text-ink-soft">No contacts yet. The petition and RTI drafts use a generic addressee.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {ward.contacts.map((c) => (
              <li key={c.department} className="text-sm">
                <p className="font-bold text-ink">
                  {c.department}
                  {c.name && <span className="font-normal text-ink-soft"> · {c.name}</span>}
                </p>
                <p className="font-mono text-xs text-ink-soft">{[c.phone, c.email].filter(Boolean).join("  ") || "No phone or email published"}</p>
                {c.source && (
                  <p className="mt-0.5 text-[0.6875rem] text-[#9a5c12]">
                    From{" "}
                    <a href={c.source} target="_blank" rel="noreferrer" className="underline">
                      {hostOf(c.source)}
                    </a>
                    {c.fetchedAt && ` · fetched ${formatDate(c.fetchedAt)}`}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        {run?.status === "failed" && (
          <p className="mt-3 text-xs text-brick">Last search didn&apos;t work: {run.error ?? "unknown problem"}</p>
        )}
      </div>

      {proposal && (
        <div className="border-t border-line bg-amber/8 px-5 py-4">
          <p className="eyebrow text-[#9a5c12]">Found by TinyFish · waiting for you</p>
          {proposal.changes.length === 0 ? (
            <p className="mt-1.5 text-sm text-ink-soft">It found nothing new or different from what is stored.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-3">
              {proposal.changes.map((c) => (
                <li key={c.department} className="text-sm">
                  <p className="font-bold text-ink">{c.department}</p>
                  <p className="text-ink-soft">
                    <span className="text-ink-faint line-through">{c.before ? describe(c.before) : "nothing"}</span>
                    {"  →  "}
                    <span className="font-bold text-ink">{describe(c.after)}</span>
                  </p>
                  {c.after.source && <p className="font-mono text-[0.6875rem] text-ink-faint">{c.after.source}</p>}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <Button size="sm" loading={busy} onClick={() => act(`/api/admin/import-runs/${run!.id}/accept`)}>
              Accept
            </Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => act(`/api/admin/import-runs/${run!.id}/reject`)}>
              Discard
            </Button>
          </div>
        </div>
      )}

      {run?.status === "running" && (
        <p className="flex items-center gap-2 border-t border-line px-5 py-3 text-xs text-ink-soft" role="status">
          <Spinner className="size-3.5" /> An agent is reading MCD&apos;s pages. This can take a few minutes.
        </p>
      )}
    </article>
  );
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function describe(c: { name?: string | null; phone?: string | null; email?: string | null }) {
  return [c.name, c.phone, c.email].filter(Boolean).join(", ") || "(empty)";
}
