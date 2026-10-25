"use client";

import type { LatLngBounds } from "leaflet";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { PublicIssue } from "@/lib/serialize";

type State = { issues: PublicIssue[]; status: "idle" | "loading" | "ready" | "error" };

const DEBOUNCE_MS = 250;

// Loads issues for whatever part of the map is on screen. Panning fires a lot of
// events, so requests are debounced and any request still in flight is cancelled.
export function useIssues() {
  const [state, setState] = useState<State>({ issues: [], status: "idle" });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inflight = useRef<AbortController>(undefined);
  const lastBounds = useRef<LatLngBounds>(undefined);

  const load = useCallback((bounds: LatLngBounds) => {
    lastBounds.current = bounds;
    clearTimeout(timer.current);

    timer.current = setTimeout(async () => {
      inflight.current?.abort();
      const controller = new AbortController();
      inflight.current = controller;

      const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
        .map((n) => n.toFixed(5))
        .join(",");

      setState((s) => ({ ...s, status: "loading" }));
      try {
        const { issues } = await api<{ issues: PublicIssue[] }>(`/api/issues?bbox=${bbox}&limit=500`, {
          signal: controller.signal,
        });
        setState({ issues, status: "ready" });
      } catch {
        // An abort means a newer request replaced this one; that request owns the state now.
        if (!controller.signal.aborted) setState((s) => ({ ...s, status: "error" }));
      }
    }, DEBOUNCE_MS);
  }, []);

  const retry = useCallback(() => {
    if (lastBounds.current) load(lastBounds.current);
  }, [load]);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      inflight.current?.abort();
    },
    [],
  );

  return { ...state, load, retry };
}
