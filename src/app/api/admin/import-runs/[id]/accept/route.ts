import { acceptContactRun, serializeRun } from "@/lib/contactImport";
import { json, route } from "@/lib/http";
import { requireStaff } from "@/lib/officials";
import { objectId } from "@/lib/validators";

// The only way a contacts proposal reaches the wards: an admin has read it and says yes.
export const POST = route(async (req, ctx: RouteContext<"/api/admin/import-runs/[id]/accept">) => {
  await requireStaff(req, "admin");
  const id = objectId((await ctx.params).id);
  return json({ run: serializeRun(await acceptContactRun(id)) });
});
