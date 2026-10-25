import { rejectContactRun, serializeRun } from "@/lib/contactImport";
import { json, route } from "@/lib/http";
import { requireStaff } from "@/lib/officials";
import { objectId } from "@/lib/validators";

export const POST = route(async (req, ctx: RouteContext<"/api/admin/import-runs/[id]/reject">) => {
  await requireStaff(req, "admin");
  const id = objectId((await ctx.params).id);
  return json({ run: serializeRun(await rejectContactRun(id)) });
});
