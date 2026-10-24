import { CATEGORY_RULES, slaDueAt } from "./categories";
import {
  ESCALATE_FAILED_CHECKS,
  ESCALATE_OVERDUE_DAYS,
  ESCALATE_REOPENS,
  type Category,
} from "./constants";
import { CATEGORY_LABELS, formatDate } from "./format";

const DAY_MS = 24 * 60 * 60 * 1000;

// Short of escalation, but close enough that the ward should know it's heading there.
const AT_RISK_OVERDUE_DAYS = 4;

type EscalationIssue = {
  category: Category;
  status: string;
  createdAt: Date | string;
  failedVerifications?: number;
  reopenCount?: number;
};

export function escalationState(issue: EscalationIssue, now: Date = new Date()) {
  const created = new Date(issue.createdAt).getTime();
  const open = issue.status !== "resolved";
  const overdueMs = open ? now.getTime() - slaDueAt(issue.category, issue.createdAt).getTime() : 0;
  const failed = issue.failedVerifications ?? 0;
  const reopened = issue.reopenCount ?? 0;

  const reasons: string[] = [];
  if (open) {
    if (overdueMs > ESCALATE_OVERDUE_DAYS * DAY_MS) {
      reasons.push(`It is ${Math.floor(overdueMs / DAY_MS)} days past its ${CATEGORY_RULES[issue.category].slaDays}-day target`);
    }
    if (failed >= ESCALATE_FAILED_CHECKS) reasons.push(`Residents checked the ward's fix ${failed} times and said it wasn't done`);
    if (reopened >= ESCALATE_REOPENS) reasons.push(`It came back after being fixed ${reopened} times`);
  }

  return {
    eligible: reasons.length > 0,
    reasons,
    daysSinceReported: Math.max(0, Math.floor((now.getTime() - created) / DAY_MS)),
    daysOverdue: Math.max(0, Math.floor(overdueMs / DAY_MS)),
  };
}

// For the ward's own queue: "eligible" once residents can escalate, "at_risk" just before.
export function escalationRisk(issue: EscalationIssue, now: Date = new Date()) {
  if (escalationState(issue, now).eligible) return "eligible" as const;
  if (issue.status === "resolved") return null;

  const overdueMs = now.getTime() - slaDueAt(issue.category, issue.createdAt).getTime();
  const atRisk =
    overdueMs >= AT_RISK_OVERDUE_DAYS * DAY_MS || (issue.failedVerifications ?? 0) >= 1 || (issue.reopenCount ?? 0) >= 1;
  return atRisk ? ("at_risk" as const) : null;
}

type Contact = { department: string; name?: string; phone?: string; email?: string };

// Ward.contacts is a flat list; the drafts look for the councillor and the PIO by department name.
export function pickContact(contacts: Contact[] | undefined, pattern: RegExp) {
  return contacts?.find((c) => pattern.test(c.department));
}

export type DraftFacts = {
  title: string;
  category: Category;
  address: string | null;
  location: { lat: number; lng: number };
  ward: { number: number; name: string; zone?: string };
  department: string;
  reportedAt: Date | string;
  slaDays: number;
  daysSinceReported: number;
  daysOverdue: number;
  peopleAffected: number;
  failedChecks: number;
  reopenCount: number;
  reasons: string[];
  issueUrl: string;
  evidenceUrl: string;
  councillor?: Contact;
  pio?: Contact;
  today?: Date;
};

export type Draft = { to: string; subject: string; body: string };

const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;
const times = (n: number) => (n === 1 ? "once" : `${n} times`);

function where(f: DraftFacts) {
  const coords = `${f.location.lat.toFixed(5)}, ${f.location.lng.toFixed(5)}`;
  return f.address ? `${f.address} (${coords})` : coords;
}

function facts(f: DraftFacts) {
  const lines = [
    `Problem: ${f.title} (${CATEGORY_LABELS[f.category]})`,
    `Location: ${where(f)}`,
    `First reported: ${formatDate(f.reportedAt)}, ${days(f.daysSinceReported)} ago`,
    `Residents who say they are affected: ${f.peopleAffected}`,
  ];
  if (f.daysOverdue > 0) lines.push(`Time allowed for this kind of problem: ${days(f.slaDays)}. It is ${days(f.daysOverdue)} past that.`);
  if (f.failedChecks > 0) {
    lines.push(`Residents nearby checked the ward's reported fix on site and said it was not done: ${times(f.failedChecks)}.`);
  }
  if (f.reopenCount > 0) lines.push(`It came back after being marked fixed: ${times(f.reopenCount)}.`);
  return lines;
}

// Counts only. Nothing in a draft names the reporter or anyone who voted.
export function buildPetition(f: DraftFacts): Draft {
  const ward = `Ward No. ${f.ward.number} (${f.ward.name})`;
  const office = f.councillor?.name ? `${f.councillor.name}, Councillor` : "The Councillor";
  const body = [
    f.councillor?.name ? `Respected ${f.councillor.name},` : "Respected Sir/Madam,",
    "",
    `I am a resident of ${ward}. I am writing about a civic problem in our ward that has not been fixed.`,
    "",
    ...facts(f),
    "",
    `Why I am writing to you: ${f.reasons.map((r) => r.charAt(0).toLowerCase() + r.slice(1)).join("; ")}.`,
    "",
    `The department responsible is ${f.department}. I request you to:`,
    "1. Have the spot inspected at the earliest.",
    "2. Get the work done properly by the responsible department.",
    "3. Tell residents what action was taken, and when.",
    "",
    `The full record, with dated photos and the timeline, is here: ${f.evidenceUrl}`,
    `Live page: ${f.issueUrl}`,
    "",
    "Yours sincerely,",
    "[Your name]",
    `[Your address in ${ward}]`,
  ].join("\n");

  return {
    to: `${office}, ${ward}, Municipal Corporation of Delhi${f.ward.zone ? `, ${f.ward.zone} Zone` : ""}`,
    subject: `Unresolved problem in ${ward}: ${f.title}`,
    body,
  };
}

export const RTI_FEE = "Rs. 10";

// MCD publishes its own RTI page. Delhi Jal Board and PWD are Delhi government
// departments, which use the Delhi government's RTI portal. Both pages should be re-checked
// before launch, since portals move.
export function rtiPortal(department: string) {
  return department.startsWith("MCD")
    ? { name: "MCD online RTI", url: "https://mcdonline.nic.in/portal/rti" }
    : { name: "Delhi government RTI portal", url: "https://rtionline.delhi.gov.in/" };
}

// An application under Section 6(1) of the Right to Information Act, 2005. The resident
// files it in their own name, so the applicant lines are left for them to fill in.
export function buildRti(f: DraftFacts): Draft {
  const today = f.today ?? new Date();
  const office = f.pio?.name ? `${f.pio.name}, Public Information Officer` : "The Public Information Officer";
  const address = `${f.department}, Municipal Corporation of Delhi${f.ward.zone ? `, ${f.ward.zone} Zone` : ""}`;
  const asks = [
    "The date and time this complaint was received by your office, with every complaint or registration number it was given.",
    "The name and designation of the officer responsible for acting on it.",
    "The action taken so far, with dates, including any inspection, work order and completion record.",
    `The reasons for any delay beyond the ${days(f.slaDays)} normally allowed for this kind of problem.`,
    "Certified copies of the file notings, work orders and completion or measurement records for this location.",
  ];
  if (f.failedChecks > 0) {
    asks.push("The basis on which the work was recorded as completed, given that residents on site said it was not done.");
  }

  const body = [
    `To,`,
    office,
    address,
    "",
    "Subject: Application under Section 6(1) of the Right to Information Act, 2005",
    "",
    "Sir/Madam,",
    "",
    `I seek the following information about the problem described below, for the period from ${formatDate(f.reportedAt)} to ${formatDate(today)}.`,
    "",
    ...facts(f).slice(0, 3),
    `Ward: No. ${f.ward.number} (${f.ward.name})`,
    "",
    "Information sought:",
    ...asks.map((ask, i) => `${i + 1}. ${ask}`),
    "",
    `A dated record of this problem, with photos, is at ${f.evidenceUrl}`,
    "",
    `I enclose the application fee of ${RTI_FEE}. [Mode of payment and receipt number, or BPL certificate if exempt.]`,
    "I state that the information sought does not fall within the exemptions in Section 8 of the Act.",
    "",
    `Date: ${formatDate(today)}`,
    "Place: Delhi",
    "",
    "Applicant:",
    "[Your full name]",
    "[Your postal address]",
    "[Your phone number or email]",
  ].join("\n");

  return {
    to: `${office}, ${address}`,
    subject: "Application under Section 6(1) of the Right to Information Act, 2005",
    body,
  };
}
