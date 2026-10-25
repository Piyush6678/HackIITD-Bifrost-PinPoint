import { json, route } from "@/lib/http";
import { serializeNotice } from "@/lib/notices";
import { requireStaff } from "@/lib/officials";
import { listNoticesSchema, searchParams } from "@/lib/validators";
import { Notice } from "@/models/Notice";

type WardRow = { _id: unknown; number: number; name: string };

export const GET = route(async (req) => {
  await requireStaff(req, "admin");
  const { status } = listNoticesSchema.parse(searchParams(req));

  const notices = await Notice.find({ approved: status === "approved" })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate<{ wards: WardRow[] }>("wards", "number name")
    .lean();
  return json({ notices: notices.map(serializeNotice) });
});
