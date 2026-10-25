import type { Types } from "mongoose";
import { Issue } from "@/models/Issue";
import { OfficerRequest } from "@/models/OfficerRequest";
import { User } from "@/models/User";
import { connectDB } from "./db";
import type { ScoredIssue } from "./scorecard";

const FIELDS = "ward status category createdAt resolvedAt failedVerifications reopenCount statusHistory";

// Small enough to score in memory for the pilot. Move the grouping into an
// aggregation pipeline if this ever covers all 250 wards.
export async function loadIssues(wardIds?: Types.ObjectId[]) {
  await connectDB();
  return Issue.find(wardIds ? { ward: { $in: wardIds } } : { ward: { $exists: true } })
    .select(FIELDS)
    .lean<(ScoredIssue & { ward: Types.ObjectId })[]>();
}

// Officers are public servants, so name and designation are public. Email never is.
export async function officerProfiles(ids: string[]) {
  const [users, requests] = await Promise.all([
    User.find({ _id: { $in: ids } }).select("name role ward").lean(),
    OfficerRequest.find({ user: { $in: ids }, status: "approved" }).sort({ reviewedAt: -1 }).select("user designation").lean(),
  ]);
  return users.map((u) => ({
    id: String(u._id),
    name: u.name,
    designation: requests.find((r) => String(r.user) === String(u._id))?.designation ?? null,
    current: u.role === "official",
    wardId: u.ward ? String(u.ward) : null,
  }));
}

export async function wardOfficerIds(wardId: Types.ObjectId) {
  const ids = await User.find({ role: "official", ward: wardId }).distinct("_id");
  return ids.map(String);
}
