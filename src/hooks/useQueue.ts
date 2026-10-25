"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Status } from "@/lib/constants";
import type { PublicIssue } from "@/lib/serialize";

export type QueueIssue = PublicIssue & {
  hoursOpen: number;
  verification: { confirms: number; rejects: number; needed: number };
  escalationRisk: "eligible" | "at_risk" | null;
  handledBy: string;
  roadLabel: string | null;
};

export type Queue = {
  ward: { id: string; number: number; name: string } | null;
  counts: Record<Status, number>;
  issues: QueueIssue[];
};

type Result = { key: string } & ({ queue: Queue; error?: undefined } | { queue?: undefined; error: string });

// Loads the ward queue for one status. The ranking comes from the server, so rows are shown in the order received.
// Admins can pass a ward number; officials always get their own ward.
export function useQueue(status: Status, ward?: number) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = `${status}:${ward ?? ""}:${attempt}`;

  useEffect(() => {
    let cancelled = false;
    api<Queue>(`/api/dashboard/queue?status=${status}${ward ? `&ward=${ward}` : ""}`)
      .then((queue) => !cancelled && setResult({ key, queue }))
      .catch(
        (err) =>
          !cancelled &&
          setResult({ key, error: err instanceof ApiError ? err.message : "Couldn't load the work queue." }),
      );
    return () => {
      cancelled = true;
    };
  }, [key, status, ward]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  // A result for another tab (or an earlier attempt) means the current one is still loading.
  const current = result?.key === key ? result : null;
  // Tab counts from the last answer stay up while the next tab loads, so they don't flicker.
  const counts = result?.queue?.counts ?? null;
  return { queue: current?.queue ?? null, counts, error: current?.error ?? null, loading: !current, retry };
}
