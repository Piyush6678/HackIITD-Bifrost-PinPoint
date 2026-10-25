import { connectDB } from "@/lib/db";
import { HttpError, json, route } from "@/lib/http";
import { candidatesFromPages, candidatesFromSearch, saveCandidates, type Candidate } from "@/lib/notices";
import { safeEqual } from "@/lib/secrets";
import { listMonitors, runMonitorNow, TinyFishError } from "@/lib/tinyfish";
import { ImportRun } from "@/models/ImportRun";

// A cap on how many monitors one call runs, since each run costs credits.
const MAX_MONITORS = 20;

// The polling route, for when webhooks can't reach us (or aren't on our plan): run each
// monitor now and ingest the results. Protected by CRON_SECRET as "Authorization: Bearer ...",
// which is what Vercel Cron sends.
async function handler(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) throw new HttpError(503, "The notices cron isn't configured");
  const header = req.headers.get("authorization") ?? "";
  if (!safeEqual(header, `Bearer ${expected}`)) throw new HttpError(401, "Wrong or missing secret");

  await connectDB();
  let candidates: Candidate[] = [];
  let failed = 0;
  try {
    const monitors = (await listMonitors()).filter((m) => m.status === undefined || m.status === "active").slice(0, MAX_MONITORS);
    for (const monitor of monitors) {
      try {
        const run = await runMonitorNow(monitor.id);
        const found = monitor.type === "search" ? candidatesFromSearch(run.results) : candidatesFromPages(run.results);
        candidates = candidates.concat(found);
      } catch {
        failed++;
      }
    }
  } catch (err) {
    const message = err instanceof TinyFishError ? err.message : "Couldn't list the monitors";
    await ImportRun.create({ kind: "notices", source: "cron", status: "failed", finishedAt: new Date(), error: message });
    throw new HttpError(err instanceof TinyFishError && err.code === "not_configured" ? 503 : 502, message);
  }

  const { added, seen } = await saveCandidates(candidates);
  await ImportRun.create({
    kind: "notices",
    source: "cron",
    status: "completed",
    finishedAt: new Date(),
    summary: `${added} new of ${seen} candidates${failed ? `, ${failed} monitors failed` : ""}`,
  });
  return json({ received: seen, added, failed });
}

export const POST = route(handler);
export const GET = route(handler);
