import { HttpError, json, route } from "@/lib/http";
import { requireStaff } from "@/lib/officials";
import { objectId, reviewNoticeSchema } from "@/lib/validators";
import { Notice } from "@/models/Notice";

type Ctx = RouteContext<"/api/admin/notices/[id]">;

// Approving (or taking back an approval) is the only thing that makes a notice public.
export const PATCH = route(async (req, ctx: Ctx) => {
  await requireStaff(req, "admin");
  const id = objectId((await ctx.params).id);
  const input = reviewNoticeSchema.parse(await req.json());

  const notice = await Notice.findByIdAndUpdate(
    id,
    {
      $set: {
        approved: input.approved,
        ...(input.categories && { categories: input.categories }),
        ...(input.approved ? { approvedAt: new Date() } : {}),
      },
      ...(input.approved ? {} : { $unset: { approvedAt: 1 } }),
    },
    { returnDocument: "after", projection: { _id: 1, approved: 1 } },
  ).lean();
  if (!notice) throw new HttpError(404, "No such notice");
  return json({ id: String(notice._id), approved: notice.approved });
});

export const DELETE = route(async (req, ctx: Ctx) => {
  await requireStaff(req, "admin");
  const id = objectId((await ctx.params).id);
  const deleted = await Notice.findByIdAndDelete(id, { projection: { _id: 1 } }).lean();
  if (!deleted) throw new HttpError(404, "No such notice");
  return json({ id });
});
