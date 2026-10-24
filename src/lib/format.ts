import type { Category } from "./constants";

export const CATEGORY_LABELS: Record<Category, string> = {
  pothole: "Pothole",
  garbage: "Garbage",
  streetlight: "Streetlight",
  waterlogging: "Waterlogging",
  sewage: "Sewage",
  encroachment: "Encroachment",
  other: "Other",
};

export const SEVERITY_LABELS = ["Minor", "Moderate", "Significant", "High", "Critical"] as const;

export function severityLabel(severity: number) {
  return SEVERITY_LABELS[Math.min(Math.max(Math.round(severity), 1), 5) - 1];
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

const relative = new Intl.RelativeTimeFormat("en-IN", { numeric: "auto" });

// `now` is a parameter so server and client render the same string, and so tests are stable.
export function timeAgo(date: Date | string, now: Date = new Date()) {
  const seconds = (new Date(date).getTime() - now.getTime()) / 1000;
  if (Math.abs(seconds) < 60) return "just now";
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export function formatDistance(metres: number) {
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(metres < 10_000 ? 1 : 0)} km`;
}

export function formatCoords({ lat, lng }: { lat: number; lng: number }, digits = 4) {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(digits)}° ${ns}, ${Math.abs(lng).toFixed(digits)}° ${ew}`;
}
