import type { QueryFilter } from "mongoose";
import { connectDB } from "@/lib/db";
import { json, route } from "@/lib/http";
import { serializeNotice } from "@/lib/notices";
import { publicNoticesSchema, searchParams } from "@/lib/validators";
import { Notice, type INotice } from "@/models/Notice";

type WardRow = { _id: unknown; number: number; name: string };

// Approved official notices only. Anything an admin hasn't approved never leaves the database.
export const GET = route(async (req) => {
  const q = publicNoticesSchema.parse(searchParams(req));

  const filter: QueryFilter<INotice> = { approved: true };
  if (q.ward) filter.wards = q.ward;
  // A notice with no categories applies to every kind of issue.
  if (q.category) filter.$or = [{ categories: q.category }, { categories: { $size: 0 } }];

  await connectDB();
  const notices = await Notice.find(filter)
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(q.limit)
    .populate<{ wards: WardRow[] }>("wards", "number name")
    .lean();

  return json({ notices: notices.map(serializeNotice) });
});
