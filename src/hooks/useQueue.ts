"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Status } from "@/lib/constants";
import type { PublicIssue } from "@/lib/serialize";

export type QueueIssue = PublicIssue & { hoursOpen: number };

export type Queue = {
  ward: { id: string; number: number; name: string } | null;
  issues: QueueIssue[];
};

type Result = { key: string } & ({ queue: Queue; error?: undefined } | { queue?: undefined; error: string });

// Loads the ward queue for one status. The ranking comes from the server, so rows are shown in the order received.
export function useQueue(status: Status) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = `${status}:${attempt}`;

  useEffect(() => {
    let cancelled = false;
    api<Queue>(`/api/dashboard/queue?status=${status}`)
      .then((queue) => !cancelled && setResult({ key, queue }))
      .catch(
        (err) =>
          !cancelled &&
          setResult({ key, error: err instanceof ApiError ? err.message : "Couldn't load the work queue." }),
      );
    return () => {
      cancelled = true;
    };
  }, [key, status]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  // A result for another tab (or an earlier attempt) means the current one is still loading.
  const current = result?.key === key ? result : null;
  return { queue: current?.queue ?? null, error: current?.error ?? null, loading: !current, retry };
}
