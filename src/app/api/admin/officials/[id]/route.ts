import { json, route } from "@/lib/http";
import { removeOfficial, requireStaff } from "@/lib/officials";
import { objectId } from "@/lib/validators";

// Demotes an official back to a resident. Their past status changes stay in each
// issue's history; only their access goes.
export const DELETE = route(async (req, ctx: RouteContext<"/api/admin/officials/[id]">) => {
  await requireStaff(req, "admin");
  const id = objectId((await ctx.params).id);

  const user = await removeOfficial(id);
  return json({ id: String(user._id), role: user.role });
});
