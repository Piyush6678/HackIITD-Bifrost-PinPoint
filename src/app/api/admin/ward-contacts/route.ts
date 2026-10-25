import { settleContactRun, serializeRun } from "@/lib/contactImport";
import { json, route } from "@/lib/http";
import { requireStaff } from "@/lib/officials";
import { ImportRun } from "@/models/ImportRun";
import { Ward } from "@/models/Ward";

// Every pilot ward's contacts, with the latest import for each. A run still waiting on
// TinyFish is checked here, so the page shows the result as soon as it is ready.
export const GET = route(async (req) => {
  await requireStaff(req, "admin");

  const wards = await Ward.find().select("number name zone contacts").sort({ number: 1 }).lean();
  const latest = await Promise.all(
    wards.map((w) => ImportRun.findOne({ kind: "contacts", "proposal.wardNumber": w.number }).sort({ startedAt: -1 }).lean()),
  );
  const settled = await Promise.all(latest.map((run) => (run ? settleContactRun(run) : null)));

  return json({
    wards: wards.map((w, i) => ({
      id: String(w._id),
      number: w.number,
      name: w.name,
      zone: w.zone,
      contacts: w.contacts.map((c) => ({
        department: c.department,
        name: c.name ?? null,
        phone: c.phone ?? null,
        email: c.email ?? null,
        source: c.source ?? null,
        fetchedAt: c.fetchedAt ?? null,
      })),
      latestRun: settled[i] ? serializeRun(settled[i], true) : null,
    })),
  });
});
