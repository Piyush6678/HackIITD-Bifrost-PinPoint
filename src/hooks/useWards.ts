"use client";

import type { Polygon } from "geojson";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { pointInPolygon, type LatLng } from "@/lib/geo";

export type WardShape = { id: string; number: number; name: string; zone: string; boundary: Polygon };

// Ward boundaries never change during a visit, so every component shares one request.
let request: Promise<WardShape[]> | null = null;

function loadWards() {
  request ??= api<{ wards: WardShape[] }>("/api/wards?boundary=true")
    .then(({ wards }) => wards)
    .catch((err) => {
      request = null; // let the next caller retry
      throw err;
    });
  return request;
}

export function useWards() {
  const [wards, setWards] = useState<WardShape[]>([]);

  useEffect(() => {
    let cancelled = false;
    // Outlines and ward names are context, not content: on failure we just show none.
    loadWards()
      .then((w) => !cancelled && setWards(w))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return wards;
}

export function wardAt(point: LatLng, wards: WardShape[]) {
  return wards.find((w) => pointInPolygon(point, w.boundary)) ?? null;
}
