import type { QueryFilter } from "mongoose";
import { after } from "next/server";
import { getSession, requireUser } from "@/lib/auth";
import { recurrenceCutoff } from "@/lib/categories";
import type { Category } from "@/lib/constants";
import { connectDB } from "@/lib/db";
import { bboxToPolygon, toGeoPoint, type LatLng } from "@/lib/geo";
import { HttpError, json, route } from "@/lib/http";
import { formFields, readPhoto } from "@/lib/photos";
import { reportBlock, screenReportPhoto } from "@/lib/photoScreen";
import { rateLimit } from "@/lib/rateLimit";
import { enrichRoad } from "@/lib/roadOwner";
import { serializeIssue } from "@/lib/serialize";
import { createIssueSchema, listIssuesSchema, searchParams } from "@/lib/validators";
import { Issue, type IIssue } from "@/models/Issue";
import { Photo } from "@/models/Photo";
import { Ward } from "@/models/Ward";

const SORTS = {
  recent: { createdAt: -1 },
  upvotes: { upvoteCount: -1, createdAt: -1 },
  severity: { severity: -1, upvoteCount: -1 },
} as const;

export const GET = route(async (req) => {
  const q = listIssuesSchema.parse(searchParams(req));
  const session = await getSession(req);

  const filter: QueryFilter<IIssue> = {};
  if (q.bbox) filter.location = { $geoWithin: { $geometry: bboxToPolygon(q.bbox) } };
  if (q.category) filter.category = { $in: q.category };
  if (q.status) filter.status = { $in: q.status };
  if (q.ward) filter.ward = q.ward;

  await connectDB();
  const issues = await Issue.find(filter)
    .select(`-verification -statusHistory -aiSuggestion -userChoice ${session ? "" : "-upvotes"}`)
    .sort(SORTS[q.sort])
    .limit(q.limit)
    .populate("ward", "name number")
    .lean();

  return json({ issues: issues.map((i) => serializeIssue(i, session?.userId)) });
});

export const POST = route(async (req) => {
  const session = await requireUser(req);
  rateLimit(`report:${session.userId}`, 10, 60 * 60_000);

  const form = await req.formData().catch(() => {
    throw new HttpError(400, "Send the report as multipart form data");
  });
  const input = createIssueSchema.parse(formFields(form));
  const photo = await readPhoto(form);

  // Usually already screened (and cached) by /api/ai/tag; checked here so it can't be skipped.
  const blocked = reportBlock(await screenReportPhoto(photo));
  if (blocked) throw new HttpError(422, blocked, { photoBlocked: true });

  await connectDB();

  const duplicate = await Issue.findNearbyDuplicate(input);
  if (duplicate) {
    throw new HttpError(409, "This looks already reported nearby. Upvote it instead.", {
      duplicateOf: serializeIssue(duplicate, session.userId),
    });
  }

  const reopened = await reopenIfRecentlyFixed(input, session.userId);
  if (reopened) return json(reopened);

  const ward = await Ward.findContaining(input);
  const saved = await Photo.create({ ...photo, uploadedBy: session.userId });

  const issue = await Issue.create({
    title: input.title,
    description: input.description,
    category: input.category,
    severity: input.severity,
    location: toGeoPoint(input),
    address: input.address,
    ward: ward?._id,
    reporter: session.userId,
    photo: saved._id,
    // The reporter is the first person affected.
    upvotes: [session.userId],
    upvoteCount: 1,
    aiSuggestion: input.aiSuggestion,
    userChoice: { category: input.category, severity: input.severity, title: input.title },
    statusHistory: [{ status: "open", by: session.userId }],
  });

  after(() => enrichRoad(String(issue._id)).catch(() => {}));

  const body = serializeIssue(
    { ...issue.toObject(), ward: ward ? { _id: ward._id, name: ward.name, number: ward.number } : undefined },
    session.userId,
  );
  return json({ issue: body }, 201);
});

const DAY_MS = 24 * 60 * 60 * 1000;

// The same problem reported again soon after it was marked fixed means the fix didn't
// hold. Reopening the old issue keeps its history (and the officer's record) honest,
// where a fresh issue would make the failed fix disappear.
async function reopenIfRecentlyFixed(input: LatLng & { category: Category }, userId: string) {
  const fixed = await Issue.findRecentlyResolved(input, recurrenceCutoff(input.category));
  if (!fixed?.resolvedAt) return null;

  const days = Math.max(1, Math.round((Date.now() - fixed.resolvedAt.getTime()) / DAY_MS));
  const updated = await Issue.findOneAndUpdate(
    { _id: fixed._id, status: "resolved" },
    {
      $set: { status: "open", "verification.confirms": [], "verification.rejects": [] },
      $unset: { resolvedAt: 1 },
      $inc: { reopenCount: 1 },
      $push: {
        statusHistory: {
          status: "open",
          by: userId,
          at: new Date(),
          note: `Reported again ${days} ${days === 1 ? "day" : "days"} after it was marked fixed`,
        },
      },
    },
    { returnDocument: "after" },
  );
  // Someone else reopened it a moment ago, so it's now an open duplicate.
  if (!updated) {
    const current = await Issue.findById(fixed._id).lean();
    throw new HttpError(409, "This looks already reported nearby. Upvote it instead.", {
      duplicateOf: serializeIssue(current!, userId),
    });
  }

  if (!updated.upvotes.some((u) => String(u) === userId)) {
    await Issue.updateOne(
      { _id: updated._id, upvotes: { $ne: userId } },
      { $push: { upvotes: userId }, $inc: { upvoteCount: 1 } },
    );
  }

  const issue = await Issue.findById(updated._id).populate("ward", "name number").lean();
  return { issue: serializeIssue(issue!, userId), reopened: true, daysSinceFix: days };
}
