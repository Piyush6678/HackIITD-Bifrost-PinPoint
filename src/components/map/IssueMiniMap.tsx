"use client";

import dynamic from "next/dynamic";
import type { PublicIssue } from "@/lib/serialize";
import { MapPlaceholder } from "./MapPlaceholder";

// Same reason as HomeMap: Leaflet needs the browser.
const IssueMiniMapView = dynamic(() => import("./IssueMiniMapView"), {
  ssr: false,
  loading: () => <MapPlaceholder />,
});

export function IssueMiniMap({ issue }: { issue: PublicIssue }) {
  return (
    <div className="relative isolate h-56 overflow-hidden rounded-card border border-line md:h-64">
      <IssueMiniMapView issue={issue} />
    </div>
  );
}
