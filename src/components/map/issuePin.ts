import { divIcon, type DivIcon } from "leaflet";
import type { Status } from "@/lib/constants";
import type { PublicIssue } from "@/lib/serialize";

const STATUS_VAR: Record<Status, string> = {
  open: "--color-status-open",
  in_progress: "--color-status-progress",
  pending_verification: "--color-status-pending",
  resolved: "--color-status-resolved",
};

// Pins grow with the number of people affected, but slowly, so one viral issue
// doesn't swallow its neighbours.
export function pinSize(upvotes: number) {
  return Math.round(18 + Math.min(14, 4 * Math.log2(upvotes + 1)));
}

const cache = new Map<string, DivIcon>();

// Leaflet markers need an HTML string, not a React element. Icons are cached by
// their visual inputs so re-renders don't rebuild the DOM for every pin.
export function issuePin({ category, status, upvoteCount }: PublicIssue, active = false) {
  const key = `${category}|${status}|${upvoteCount}|${active}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const size = pinSize(upvoteCount) + (active ? 6 : 0);
  const badge = upvoteCount > 1 ? `<span class="pin-count">${upvoteCount > 99 ? "99+" : upvoteCount}</span>` : "";

  const icon = divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    html: `<span class="pin${status === "resolved" ? " pin-resolved" : ""}${active ? " pin-active" : ""}" style="--pin:var(--color-cat-${category});--ring:var(${STATUS_VAR[status]});width:${size}px;height:${size}px">${badge}</span>`,
  });
  cache.set(key, icon);
  return icon;
}
