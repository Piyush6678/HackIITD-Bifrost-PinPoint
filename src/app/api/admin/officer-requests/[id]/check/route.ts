import { HttpError, json, route } from "@/lib/http";
import { requireStaff } from "@/lib/officials";
import { rateLimit } from "@/lib/rateLimit";
import { checkPublicRecords } from "@/lib/recordsCheck";
import { TinyFishError } from "@/lib/tinyfish";
import { objectId } from "@/lib/validators";
import { ImportRun } from "@/models/ImportRun";
import { OfficerRequest } from "@/models/OfficerRequest";

type Populated = { user: { name: string } | null; ward: { name: string } | null };

// Helps an admin decide on an officer request by searching official MCD and Delhi government
// pages for the applicant. It only reports what it found; nothing is stored about the person,
// and the log keeps just counts.
export const POST = route(async (req, ctx: RouteContext<"/api/admin/officer-requests/[id]/check">) => {
  const admin = await requireStaff(req, "admin");
  rateLimit(`records-check:${admin._id}`, 30, 60 * 60_000);
  const id = objectId((await ctx.params).id);

  const request = await OfficerRequest.findById(id)
    .populate<Populated>("user", "name")
    .populate<Populated>("ward", "name")
    .lean();
  if (!request) throw new HttpError(404, "No such request");
  if (!request.user) throw new HttpError(409, "That account no longer exists");

  try {
    const result = await checkPublicRecords({
      name: request.user.name,
      designation: request.designation,
      department: request.department,
      ward: request.ward?.name ?? "",
    });
    await ImportRun.create({
      kind: "records_check",
      source: "Officer request check",
      status: "completed",
      finishedAt: new Date(),
      requestedBy: admin._id,
      summary: `${result.hits.length} pages read, name found on ${result.nameFoundOn}`,
    });
    return json({ checkedAt: new Date(), ...result });
  } catch (err) {
    if (err instanceof TinyFishError) {
      await ImportRun.create({
        kind: "records_check",
        source: "Officer request check",
        status: "failed",
        finishedAt: new Date(),
        requestedBy: admin._id,
        error: err.message,
      });
      throw new HttpError(err.code === "not_configured" ? 503 : 502, err.message);
    }
    throw err;
  }
});
