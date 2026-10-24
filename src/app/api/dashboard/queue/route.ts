import type { QueryFilter } from "mongoose";
import { STATUSES, type Status } from "@/lib/constants";
import { HttpError, json, route } from "@/lib/http";
import { wardByNumber } from "@/lib/officerRequests";
import { requireStaff } from "@/lib/officials";
import { serializeIssue, serializeVerification } from "@/lib/serialize";
import { queueSchema, searchParams } from "@/lib/validators";
import { Issue, type IIssue } from "@/models/Issue";
import { Ward } from "@/models/Ward";

const HOUR_MS = 60 * 60 * 1000;

// The officer's work list. Most people affected first, then the worst, then whatever
// has waited longest, so one loud report can't bury an old dangerous one forever.
export const GET = route(async (req) => {
  const user = await requireStaff(req, "official", "admin");
  const q = queueSchema.parse(searchParams(req));

  let wardId = user.ward;
  if (user.role === "official" && !wardId) {
    throw new HttpError(409, "Your account isn't linked to a ward yet. Ask your PinPoint admin.");
  }
  if (user.role === "admin" && q.ward) {
    wardId = await wardByNumber(q.ward);
  }

  const ward = wardId ? await Ward.findById(wardId).select("name number").lean() : null;
  const scope: QueryFilter<IIssue> = wardId ? { ward: wardId } : {};

  const [issues, counts] = await Promise.all([
    Issue.find({ ...scope, status: q.status })
      .select("-statusHistory -aiSuggestion -userChoice -upvotes")
      .sort({ upvoteCount: -1, severity: -1, createdAt: 1 })
      .limit(200)
      .populate("ward", "name number")
      .lean(),
    Issue.aggregate<{ _id: Status; n: number }>([{ $match: scope }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);

  const now = Date.now();
  return json({
    ward: ward ? { id: String(ward._id), number: ward.number, name: ward.name } : null,
    counts: Object.fromEntries(STATUSES.map((s) => [s, counts.find((c) => c._id === s)?.n ?? 0])),
    issues: issues.map((issue) => ({
      ...serializeIssue(issue),
      verification: serializeVerification(issue),
      // Resolved issues stop the clock at the fix.
      hoursOpen: ((issue.resolvedAt?.getTime() ?? now) - issue.createdAt.getTime()) / HOUR_MS,
    })),
  });
});
