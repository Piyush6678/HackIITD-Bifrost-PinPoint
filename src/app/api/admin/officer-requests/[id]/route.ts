import { json, route } from "@/lib/http";
import { reviewRequest } from "@/lib/officerRequests";
import { requireStaff } from "@/lib/officials";
import { objectId, reviewRequestSchema } from "@/lib/validators";

export const PATCH = route(async (req, ctx: RouteContext<"/api/admin/officer-requests/[id]">) => {
  const admin = await requireStaff(req, "admin");
  const id = objectId((await ctx.params).id);
  const review = reviewRequestSchema.parse(await req.json());

  return json({ request: await reviewRequest(id, admin._id, review) });
});
