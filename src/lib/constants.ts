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
// Votes either way needed to settle a fix: this many "fixed" verify it, this many
// "not fixed" send it back to the officer. Whichever side gets there first wins.
export const VERIFY_VOTES_NEEDED = 3;
export const NEARBY_MAX_RADIUS_M = 2000;

// An officer marking a fix must be standing at the issue, with a usable GPS fix,
// and the after-photo must have been taken a moment ago.
export const FIX_RADIUS_M = 50;
export const FIX_MAX_ACCURACY_M = 100;
export const FIX_PHOTO_MAX_AGE_MIN = 15;

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Only government addresses can be made officials through the admin API.
// The CLI scripts can override this for demo accounts.
export const OFFICIAL_EMAIL_DOMAINS = ["mcd.nic.in", "delhi.gov.in"];

export function isOfficialEmail(email: string) {
  const domain = email.trim().toLowerCase().split("@")[1];
  return Boolean(domain) && OFFICIAL_EMAIL_DOMAINS.includes(domain);
}

export const REQUEST_STATUSES = ["pending", "approved", "rejected"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const SESSION_COOKIE = "pp_session";
export const SESSION_TTL_DAYS = 7;
