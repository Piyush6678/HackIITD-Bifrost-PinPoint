"use client";

import { useEffect, useState } from "react";
import { Marker, Popup, useMap, useMapEvent } from "react-leaflet";
import { useIssues } from "@/hooks/useIssues";
import { IssuePopup } from "./IssuePopup";
import { issuePin } from "./issuePin";

export function IssueLayer() {
  const map = useMap();
  const { issues, status, load, retry } = useIssues();
  const [activeId, setActiveId] = useState<string | null>(null);

  useMapEvent("moveend", () => load(map.getBounds()));
  useEffect(() => {
    load(map.getBounds());
  }, [map, load]);

  return (
    <>
      {issues.map((issue) => (
        <Marker
          key={issue.id}
          position={[issue.location.lat, issue.location.lng]}
          icon={issuePin(issue, issue.id === activeId)}
          title={issue.title}
          alt={issue.title}
          // Busier issues sit on top when pins overlap.
          zIndexOffset={issue.upvoteCount * 10}
          eventHandlers={{
            popupopen: () => setActiveId(issue.id),
            popupclose: () => setActiveId((id) => (id === issue.id ? null : id)),
          }}
        >
          <Popup closeButton={false} className="issue-popup">
            <IssuePopup issue={issue} />
          </Popup>
        </Marker>
      ))}

      <MapStatus count={issues.length} status={status} onRetry={retry} />
    </>
  );
}

function MapStatus({
  count,
  status,
  onRetry,
}: {
  count: number;
  status: "idle" | "loading" | "ready" | "error";
  onRetry: () => void;
}) {
  // Rendered inside the map container, so it needs Leaflet's control z-index to sit above the panes.
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-1000">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-line bg-white/95 px-3 py-1.5 text-xs font-bold text-ink shadow-card">
        {status === "error" ? (
          <>
            <span className="size-2 rounded-full bg-brick" />
            Couldn&apos;t load issues
            <button type="button" onClick={onRetry} className="text-brand hover:underline">
              Retry
            </button>
          </>
        ) : status === "loading" || status === "idle" ? (
          <>
            <span className="size-2 animate-pulse rounded-full bg-mint" />
            Loading issues
          </>
        ) : (
          <>
            <span className="size-2 rounded-full bg-mint" />
            {count === 0 ? "No issues reported in this area" : `${count} ${count === 1 ? "issue" : "issues"} in view`}
          </>
        )}
      </div>
    </div>
  );
}
