import { serializeRun } from "@/lib/contactImport";
import { json, route } from "@/lib/http";
import { requireStaff } from "@/lib/officials";
import { listRunsSchema, searchParams } from "@/lib/validators";
import { ImportRun } from "@/models/ImportRun";

// The log of everything TinyFish was asked to do, newest first.
export const GET = route(async (req) => {
  await requireStaff(req, "admin");
  const { kind } = listRunsSchema.parse(searchParams(req));

  const runs = await ImportRun.find(kind ? { kind } : {}).sort({ startedAt: -1 }).limit(100).lean();
  return json({ runs: runs.map((r) => serializeRun(r)) });
});
