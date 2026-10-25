"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { RequestStatus } from "@/lib/constants";
import type { PublicRequest } from "@/lib/officerRequests";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Chip } from "../ui/Chip";
import { EmptyState } from "../ui/EmptyState";
import { Skeleton } from "../ui/Skeleton";
import { ImportRunsTab } from "./ImportRunsTab";
import { NoticesTab } from "./NoticesTab";
import { OfficialsTable } from "./OfficialsTable";
import { RequestCard } from "./RequestCard";
import { WardContactsTab } from "./WardContactsTab";

type Tab = "requests" | "officials" | "contacts" | "notices" | "imports";

const FILTERS: { status: RequestStatus; label: string; empty: string }[] = [
  { status: "pending", label: "Waiting", empty: "No one is waiting. New requests from /officer-access show up here." },
  { status: "approved", label: "Approved", empty: "Nothing approved yet." },
  { status: "rejected", label: "Rejected", empty: "Nothing rejected yet." },
];

// Loads one list and lets the caller reload it after a change.
function useList<T>(path: string, pick: (data: never) => T[]) {
  const [state, setState] = useState<{ path: string; items?: T[]; error?: string } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api<never>(path)
      .then((data) => !cancelled && setState({ path, items: pick(data) }))
      .catch(
        (err) => !cancelled && setState({ path, error: err instanceof ApiError ? err.message : "Couldn't load this list." }),
      );
    return () => {
      cancelled = true;
    };
    // pick is a stable inline selector; the path and attempt are what change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const current = state?.path === path ? state : null;
  return { items: current?.items ?? null, error: current?.error ?? null, reload };
}

export function AdminPanel() {
  const [tab, setTab] = useState<Tab>("requests");
  const [filter, setFilter] = useState<RequestStatus>("pending");
  const requests = useList<PublicRequest>(
    `/api/admin/officer-requests?status=${filter}`,
    (d: { requests: PublicRequest[] }) => d.requests,
  );
  const waiting = useList<PublicRequest>("/api/admin/officer-requests", (d: { requests: PublicRequest[] }) => d.requests);
  const officials = useList<Official>("/api/admin/officials", (d: { officials: Official[] }) => d.officials);

  function onDecided() {
    requests.reload();
    waiting.reload();
    officials.reload();
  }

  const empty = FILTERS.find((f) => f.status === filter)!.empty;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6 md:py-8">
      <p className="eyebrow text-ink-faint">Admin</p>
      <h1 className="mt-1 font-serif text-[1.75rem] font-bold leading-tight text-ink md:text-4xl">Officer access</h1>
      <p className="mt-1.5 text-sm text-ink-soft">
        Check who each person is before approving them. An officer can mark issues in their ward as fixed.
      </p>

      <div role="tablist" aria-label="Admin sections" className="mt-6 flex gap-1 overflow-x-auto border-b border-line">
        <TabButton active={tab === "requests"} onClick={() => setTab("requests")} count={waiting.items?.length}>
          Requests
        </TabButton>
        <TabButton active={tab === "officials"} onClick={() => setTab("officials")} count={officials.items?.length}>
          Officers
        </TabButton>
        <TabButton active={tab === "contacts"} onClick={() => setTab("contacts")}>
          Ward contacts
        </TabButton>
        <TabButton active={tab === "notices"} onClick={() => setTab("notices")}>
          Notices
        </TabButton>
        <TabButton active={tab === "imports"} onClick={() => setTab("imports")}>
          TinyFish runs
        </TabButton>
      </div>

      {tab === "requests" ? (
        <div className="mt-5">
          <div className="flex gap-2">
            {FILTERS.map(({ status, label }) => (
              <Chip key={status} label={label} selected={filter === status} onClick={() => setFilter(status)} />
            ))}
          </div>
          <div className="mt-4">
            <ListBody list={requests} empty={empty}>
              {(items) => (
                <ul className="flex flex-col gap-3">
                  {items.map((r) => (
                    <li key={r.id}>
                      <RequestCard request={r} onDecided={onDecided} />
                    </li>
                  ))}
                </ul>
              )}
            </ListBody>
          </div>
        </div>
      ) : tab === "contacts" ? (
        <div className="mt-5">
          <WardContactsTab />
        </div>
      ) : tab === "notices" ? (
        <div className="mt-5">
          <NoticesTab />
        </div>
      ) : tab === "imports" ? (
        <div className="mt-5">
          <ImportRunsTab />
        </div>
      ) : (
        <div className="mt-5">
          <ListBody list={officials} empty="No officers yet. Approve a request to add one.">
            {(items) => <OfficialsTable officials={items} onChanged={officials.reload} />}
          </ListBody>
        </div>
      )}
    </div>
  );
}

export type Official = {
  id: string;
  name: string;
  email: string;
  ward: { id: string; name: string; number: number } | null;
};

function ListBody<T>({
  list,
  empty,
  children,
}: {
  list: { items: T[] | null; error: string | null; reload: () => void };
  empty: string;
  children: (items: T[]) => React.ReactNode;
}) {
  if (list.error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert>{list.error}</Alert>
        <Button variant="secondary" onClick={list.reload}>
          Try again
        </Button>
      </div>
    );
  }
  if (!list.items) {
    return (
      <div role="status" aria-label="Loading" className="flex flex-col gap-3">
        <Skeleton className="h-32 w-full rounded-card" />
        <Skeleton className="h-32 w-full rounded-card" />
      </div>
    );
  }
  if (list.items.length === 0) return <EmptyState title="Nothing here">{empty}</EmptyState>;
  return children(list.items);
}

function TabButton({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${
        active ? "border-mint text-pine" : "border-transparent text-ink-faint hover:text-ink"
      }`}
    >
      {children}
      {count !== undefined && (
        <span className="rounded-full bg-mist px-1.5 font-mono text-[0.6875rem] font-normal text-ink-soft">{count}</span>
      )}
    </button>
  );
}
