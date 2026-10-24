import type { QueryFilter } from "mongoose";
import { getSession, requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { bboxToPolygon, toGeoPoint } from "@/lib/geo";
import { HttpError, json, route } from "@/lib/http";
import { formFields, readPhoto } from "@/lib/photos";
import { rateLimit } from "@/lib/rateLimit";
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

  await connectDB();

  const duplicate = await Issue.findNearbyDuplicate(input);
  if (duplicate) {
    throw new HttpError(409, "This looks already reported nearby. Upvote it instead.", {
      duplicateOf: serializeIssue(duplicate, session.userId),
    });
  }

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

  const body = serializeIssue(
    { ...issue.toObject(), ward: ward ? { _id: ward._id, name: ward.name, number: ward.number } : undefined },
    session.userId,
  );
  return json({ issue: body }, 201);
});
