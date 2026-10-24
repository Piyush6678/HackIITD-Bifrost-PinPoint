export const CATEGORIES = [
  "pothole",
  "garbage",
  "streetlight",
  "waterlogging",
  "sewage",
  "encroachment",
  "other",
] as const;

export const STATUSES = [
  "open",
  "in_progress",
  "pending_verification",
  "resolved",
] as const;

export const STATUS_LABELS: Record<(typeof STATUSES)[number], string> = {
  open: "Open",
  in_progress: "In progress",
  pending_verification: "Pending verification",
  resolved: "Resolved",
};

export const ROLES =["citizen", "official", "admin"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Status = (typeof STATUSES)[number];
export type Role = (typeof ROLES)[number];

export const DUPLICATE_RADIUS_M = 50;
export const CONFIRM_RADIUS_M = 300;
export const NEARBY_MAX_RADIUS_M = 2000;

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const SESSION_COOKIE = "pp_session";
export const SESSION_TTL_DAYS = 7;
