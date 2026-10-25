import { serializeRun, startContactRun } from "@/lib/contactImport";
import { HttpError, json, route } from "@/lib/http";
import { requireStaff } from "@/lib/officials";
import { rateLimit } from "@/lib/rateLimit";
import { TinyFishError } from "@/lib/tinyfish";
import { refreshContactsSchema } from "@/lib/validators";
import { ImportRun } from "@/models/ImportRun";

// Starts a TinyFish agent on MCD's own pages. It costs credits, so a person has to ask,
// one ward at a time, and a ward with a run still going can't be started again.
export const POST = route(async (req) => {
  const admin = await requireStaff(req, "admin");
  rateLimit(`contacts-refresh:${admin._id}`, 12, 60 * 60_000);
  const { ward } = refreshContactsSchema.parse(await req.json());

  const running = await ImportRun.exists({ kind: "contacts", status: "running", "proposal.wardNumber": ward });
  if (running) throw new HttpError(409, "A search for this ward is already running");

  try {
    return json({ run: serializeRun(await startContactRun(ward, String(admin._id)).then((r) => r.toObject())) }, 202);
  } catch (err) {
    if (err instanceof TinyFishError) {
      throw new HttpError(err.code === "not_configured" ? 503 : 502, err.message);
    }
    throw err;
  }
});
