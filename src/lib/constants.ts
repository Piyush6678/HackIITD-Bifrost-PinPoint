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
export const FIX_RADIUS_M = 500000;
export const FIX_MAX_ACCURACY_M = 3000;
export const FIX_PHOTO_MAX_AGE_MIN = 15;
// Gemini's estimate that the after-photo shows this problem fixed. Below it, the fix is refused.
export const FIX_MIN_MATCH_PERCENT = 60;

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

export const NOTIFICATION_KINDS = ["verify_request", "verified", "failed", "in_progress", "access_decided"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

// A popular issue can have thousands of upvoters; only this many get a ping per event.
export const NOTIFY_MAX_RECIPIENTS = 100;
export const NOTIFICATION_TTL_DAYS = 60;
export const NOTIFICATIONS_PAGE_SIZE = 30;

// An issue can be escalated once any one of these is true (see lib/escalation.ts).
export const ESCALATE_OVERDUE_DAYS = 7;
export const ESCALATE_FAILED_CHECKS = 2;
export const ESCALATE_REOPENS = 2;

export const IMPORT_KINDS = ["wards", "roads", "contacts", "notices", "records_check"] as const;
export type ImportKind = (typeof IMPORT_KINDS)[number];
export const IMPORT_STATUSES = ["running", "needs_review", "applied", "rejected", "completed", "failed"] as const;
export type ImportStatus = (typeof IMPORT_STATUSES)[number];

// Only these official sites are searched when an admin checks an officer's details.
export const OFFICIAL_RECORD_DOMAINS = ["mcdonline.nic.in", "mcd.gov.in", "mcd.nic.in", "delhi.gov.in"];

export const ROAD_OWNERS = ["MCD", "PWD"] as const;
export type RoadOwner = (typeof ROAD_OWNERS)[number];
// Roads wider than this belong to PWD, not MCD.
export const PWD_ROAD_MIN_WIDTH_FT = 60;
