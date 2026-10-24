import type { Category } from "./constants";

// Everything that differs between kinds of problem lives here, so the ward queue,
// the issue page, verification and the scorecard all agree.
type Rule = {
  // Working target for a fix. Past this, the issue counts as overdue.
  slaDays: number;
  // A fresh report at the same spot within this many days of a fix reopens the old
  // issue instead of starting a new one: the fix didn't hold.
  recurrenceDays: number;
  // Who is normally responsible in Delhi. Shown to residents; routing comes later.
  department: string;
  // Streetlights can't be judged from a daytime photo.
  verifyAfterDark: boolean;
  // What residents should look for when they confirm or reject a fix.
  verifyHint: string;
};

export const CATEGORY_RULES: Record<Category, Rule> = {
  pothole: {
    slaDays: 7,
    recurrenceDays: 30,
    department: "MCD Engineering (PWD for roads over 60 ft)",
    verifyAfterDark: false,
    verifyHint: "Is the surface filled and level, not just patched with loose gravel?",
  },
  garbage: {
    slaDays: 2,
    recurrenceDays: 7,
    department: "MCD Sanitation",
    verifyAfterDark: false,
    verifyHint: "Is the spot clear, and is the bin back in place?",
  },
  streetlight: {
    slaDays: 3,
    recurrenceDays: 14,
    department: "MCD Electrical",
    verifyAfterDark: true,
    verifyHint: "Was the light actually on after dark?",
  },
  waterlogging: {
    slaDays: 2,
    recurrenceDays: 30,
    department: "Delhi Jal Board / PWD drainage",
    verifyAfterDark: false,
    verifyHint: "Is the drain cleared so water can run off? It's only truly tested by the next rain.",
  },
  sewage: {
    slaDays: 2,
    recurrenceDays: 14,
    department: "Delhi Jal Board",
    verifyAfterDark: false,
    verifyHint: "Is the manhole covered and the overflow stopped?",
  },
  encroachment: {
    slaDays: 14,
    recurrenceDays: 30,
    department: "MCD Enforcement",
    verifyAfterDark: false,
    verifyHint: "Is the footpath or road free to use again?",
  },
  other: {
    slaDays: 7,
    recurrenceDays: 14,
    department: "MCD ward office",
    verifyAfterDark: false,
    verifyHint: "Is the problem in the report actually gone?",
  },
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function slaDueAt(category: Category, createdAt: Date | string) {
  return new Date(new Date(createdAt).getTime() + CATEGORY_RULES[category].slaDays * DAY_MS);
}

export function isOverdue(
  issue: { category: Category; status: string; createdAt: Date | string },
  now: Date = new Date(),
) {
  return issue.status !== "resolved" && slaDueAt(issue.category, issue.createdAt) < now;
}

export function recurrenceCutoff(category: Category, now: Date = new Date()) {
  return new Date(now.getTime() - CATEGORY_RULES[category].recurrenceDays * DAY_MS);
}

// Streetlights are only judged at night, 6:30 pm to 5:30 am in Delhi, whatever
// time zone the server runs in.
const IST_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function isAfterDark(now: Date = new Date()) {
  const [hours, minutes] = IST_TIME.format(now).split(":").map(Number);
  const minute = hours * 60 + minutes;
  return minute >= 18 * 60 + 30 || minute < 5 * 60 + 30;
}
