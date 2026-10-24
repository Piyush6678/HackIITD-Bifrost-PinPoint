"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Category } from "@/lib/constants";
import type { LatLng } from "@/lib/geo";
import type { PublicIssue } from "@/lib/serialize";
import { NearbyIssueCard } from "./NearbyIssueCard";

type Nearby = PublicIssue & { distance: number };

const RADIUS_M = 150;

type Props = {
  place: LatLng;
  category: Category | null;
};

export function NearbyIssues({ place, category }: Props) {
  const key = `${place.lat},${place.lng},${category ?? ""}`;
  const [result, setResult] = useState<{ key: string; issues: Nearby[] } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      lat: String(place.lat),
      lng: String(place.lng),
      radius: String(RADIUS_M),
    });
    if (category) params.set("category", category);

    api<{ issues: Nearby[] }>(`/api/issues/nearby?${params}`, { signal: controller.signal })
      .then(({ issues }) => setResult({ key, issues }))
      // The check is a courtesy; the server still rejects true duplicates on submit.
      .catch(() => !controller.signal.aborted && setResult({ key, issues: [] }));

    return () => controller.abort();
  }, [key, place.lat, place.lng, category]);

  if (!result || result.key !== key || result.issues.length === 0) return null;

  return (
    <section aria-labelledby="nearby-heading" className="rounded-card bg-mist px-4 py-4">
      <h2 id="nearby-heading" className="font-serif text-lg font-bold text-ink">
        Already reported near you
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        If one of these is your problem, add your voice. More people on one report gets it fixed sooner.
      </p>
      <div className="mt-3 flex flex-col gap-3">
        {result.issues.map((issue) => (
          <NearbyIssueCard key={issue.id} issue={issue} />
        ))}
      </div>
    </section>
  );
}
