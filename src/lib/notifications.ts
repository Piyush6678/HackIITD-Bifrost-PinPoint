import type { Types } from "mongoose";
import { Notification, type INotification } from "@/models/Notification";
import { User } from "@/models/User";
import { NOTIFY_MAX_RECIPIENTS, type NotificationKind } from "./constants";

type Entry = Pick<INotification, "user" | "kind" | "message"> & Partial<Pick<INotification, "issue" | "note">>;

type IssueRefs = { _id: Types.ObjectId; reporter: Types.ObjectId; upvotes?: Types.ObjectId[]; ward?: Types.ObjectId };

// A notification is a courtesy. If saving one fails, the change that caused it has
// already happened and must not look like it failed.
async function send(entries: Entry[]) {
  if (entries.length === 0) return;
  try {
    await Notification.insertMany(entries, { ordered: false });
  } catch (err) {
    console.error("Couldn't save notifications", err);
  }
}

// The reporter first, then upvoters up to the cap, each person once.
export function affectedPeople(issue: Pick<IssueRefs, "reporter" | "upvotes">) {
  const seen = new Set<string>();
  const people: Types.ObjectId[] = [];
  for (const id of [issue.reporter, ...(issue.upvotes ?? [])]) {
    if (seen.has(String(id))) continue;
    seen.add(String(id));
    people.push(id);
    if (people.length >= NOTIFY_MAX_RECIPIENTS) break;
  }
  return people;
}

function toPeople(issue: IssueRefs, people: Types.ObjectId[], kind: NotificationKind, message: string, note?: string) {
  return people.map((user) => ({ user, issue: issue._id, kind, message, note }));
}

export function notifyFixPosted(issue: IssueRefs) {
  return send(toPeople(issue, affectedPeople(issue), "verify_request", "Is it fixed? Check the officer's photo"));
}

export function notifyVerified(issue: IssueRefs) {
  return send(toPeople(issue, affectedPeople(issue), "verified", "Fixed and verified by residents"));
}

export async function notifyFailed(issue: IssueRefs) {
  const officers = issue.ward ? await User.find({ role: "official", ward: issue.ward }).select("_id").lean() : [];
  const people = [issue.reporter, ...officers.map((o) => o._id)];
  const unique = people.filter((id, i) => people.findIndex((other) => String(other) === String(id)) === i);
  await send(toPeople(issue, unique, "failed", "Residents say it isn't fixed yet"));
}

export function notifyWorkStarted(issue: Pick<IssueRefs, "_id" | "reporter">, note?: string) {
  return send(toPeople(issue as IssueRefs, [issue.reporter], "in_progress", "Work has started", note));
}

export function notifyAccessDecided(user: Types.ObjectId, approved: boolean, detail: { ward?: number; reason?: string }) {
  const message = approved
    ? `Approved: you're now the officer${detail.ward ? ` for Ward ${detail.ward}` : ""}`
    : `Not approved${detail.reason ? `: ${detail.reason}` : ""}`;
  return send([{ user, kind: "access_decided", message }]);
}

type Row = Omit<INotification, "issue"> & { issue?: { _id: Types.ObjectId; title: string } | Types.ObjectId | null };

export function serializeNotification(n: Row) {
  const issue = n.issue && "title" in n.issue ? n.issue : null;
  const issueId = n.issue ? String(issue ? issue._id : n.issue) : null;
  return {
    id: String(n._id),
    kind: n.kind,
    message: n.message,
    note: n.note ?? null,
    read: n.read,
    createdAt: n.createdAt,
    issue: issueId ? { id: issueId, title: issue?.title ?? null } : null,
  };
}

export type PublicNotification = ReturnType<typeof serializeNotification>;
