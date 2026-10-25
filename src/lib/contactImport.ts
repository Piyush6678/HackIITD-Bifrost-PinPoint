import { z } from "zod";
import { generatedWards } from "@/data/wards.generated";
import { ImportRun, type IImportRun } from "@/models/ImportRun";
import { Ward, type IWard } from "@/models/Ward";
import { OFFICIAL_RECORD_DOMAINS } from "./constants";
import { HttpError } from "./http";
import { getRun, searchWeb, startAgentRun, TinyFishError } from "./tinyfish";

// Brings a ward's councillor and RTI officers in from MCD's own pages. TinyFish only reads;
// what it found waits in an ImportRun as a proposal until an admin accepts it, and nothing
// touches Ward.contacts before that.

export type Contact = NonNullable<IWard["contacts"]>[number];
export type Proposed = Required<Pick<Contact, "department">> & Omit<Contact, "department">;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    contacts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          department: { type: "string" },
          name: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          source_url: { type: "string" },
        },
        required: ["department"],
      },
    },
  },
  required: ["contacts"],
};

const resultSchema = z.object({
  contacts: z.array(
    z.object({
      department: z.string().trim().min(2).max(80),
      name: z.string().trim().max(120).optional(),
      phone: z.string().trim().max(40).optional(),
      email: z.string().trim().max(120).optional(),
      source_url: z.string().trim().max(300).optional(),
    }),
  ),
});

export type ContactProposal = {
  wardNumber: number;
  fetchedAt?: string;
  contacts: Proposed[];
  changes: { department: string; before: Contact | null; after: Proposed }[];
};

const officialNumber = (number: number) => generatedWards.find((w) => w.number === number)?.officialNumber ?? number;

export async function startContactRun(wardNumber: number, requestedBy?: string) {
  const ward = await Ward.findOne({ number: wardNumber }).select("name number zone").lean();
  if (!ward) throw new HttpError(404, `There's no ward ${wardNumber} in the pilot`);
  const official = officialNumber(ward.number);

  // Start the agent on the most relevant official page; the home page is the fallback.
  const hits = await searchWeb(`MCD councillor ward ${official} ${ward.name} ${ward.zone} zone PIO deputy commissioner contact`, {
    includeDomains: OFFICIAL_RECORD_DOMAINS,
    purpose: "Find the official page listing this ward's councillor and RTI officers",
  }).catch((err) => {
    if (err instanceof TinyFishError && err.code === "not_configured") throw err;
    return [];
  });
  const start = hits[0]?.url ?? "https://mcdonline.nic.in/";

  const goal = [
    `Find the contact details published on this official MCD website for the ward "${ward.name}" (ward ${official}) in the ${ward.zone} Zone of the Municipal Corporation of Delhi:`,
    `1. The Councillor of this ward (department "Councillor").`,
    `2. The Public Information Officer for the ${ward.zone} Zone (department "PIO").`,
    `3. The First Appellate Authority for RTI for the ${ward.zone} Zone (department "First Appellate Authority").`,
    `4. The Deputy Commissioner of the ${ward.zone} Zone (department "Deputy Commissioner").`,
    "Return name, phone, email and the page address each came from.",
    "Only include a phone number or email if it is published on the site. If something is not published, leave it out. Do not guess.",
  ].join("\n");

  const agentRunId = await startAgentRun({ url: start, goal, outputSchema: OUTPUT_SCHEMA });
  return ImportRun.create({
    kind: "contacts",
    source: start,
    status: "running",
    agentRunId,
    summary: `Ward ${ward.number} ${ward.name}`,
    proposal: { wardNumber: ward.number },
    requestedBy,
  });
}

export function diffContacts(current: Contact[], proposed: Proposed[]) {
  const key = (d: string) => d.trim().toLowerCase();
  return proposed
    .map((after) => ({ department: after.department, before: current.find((c) => key(c.department) === key(after.department)) ?? null, after }))
    .filter(({ before, after }) => !before || before.name !== after.name || before.phone !== after.phone || before.email !== after.email);
}

// Checks on a running agent and, once it has finished, turns its answer into a proposal.
// Safe to call again and again: only a "running" run is touched.
export async function settleContactRun(run: IImportRun & { _id: unknown }) {
  if (run.status !== "running" || !run.agentRunId) return run;

  const agent = await getRun(run.agentRunId).catch(() => null);
  if (!agent?.done) return run;

  const wardNumber = (run.proposal as { wardNumber: number }).wardNumber;
  const finish = { finishedAt: new Date() };

  if (agent.status !== "COMPLETED") {
    return ImportRun.findOneAndUpdate(
      { _id: run._id, status: "running" },
      { $set: { ...finish, status: "failed", error: agent.error ?? "TinyFish didn't finish the search" } },
      { returnDocument: "after" },
    ).lean();
  }

  const parsed = resultSchema.safeParse(agent.result);
  const fetchedAt = new Date();
  const contacts: Proposed[] = parsed.success
    ? parsed.data.contacts.map((c) => ({
        department: c.department,
        name: c.name || undefined,
        phone: c.phone || undefined,
        email: c.email || undefined,
        source: c.source_url || run.source,
        fetchedAt,
      }))
    : [];

  if (contacts.length === 0) {
    return ImportRun.findOneAndUpdate(
      { _id: run._id, status: "running" },
      { $set: { ...finish, status: "failed", error: "No contacts were found on the official pages" } },
      { returnDocument: "after" },
    ).lean();
  }

  const ward = await Ward.findOne({ number: wardNumber }).select("contacts").lean();
  const proposal: ContactProposal = {
    wardNumber,
    fetchedAt: fetchedAt.toISOString(),
    contacts,
    changes: diffContacts(ward?.contacts ?? [], contacts),
  };
  return ImportRun.findOneAndUpdate(
    { _id: run._id, status: "running" },
    {
      $set: {
        ...finish,
        status: "needs_review",
        proposal,
        summary: `Ward ${wardNumber}: ${contacts.length} found, ${proposal.changes.length} new or changed`,
      },
    },
    { returnDocument: "after" },
  ).lean();
}

// Claims the run first, so two admins clicking at once can only apply it once.
export async function acceptContactRun(id: string) {
  const run = await ImportRun.findOneAndUpdate(
    { _id: id, kind: "contacts", status: "needs_review" },
    { $set: { status: "applied" } },
    { returnDocument: "after" },
  ).lean();
  if (!run) throw new HttpError(409, "That proposal isn't waiting for review");

  const proposal = run.proposal as ContactProposal;
  const ward = await Ward.findOne({ number: proposal.wardNumber }).select("contacts");
  if (!ward) throw new HttpError(404, "That ward no longer exists");

  // Replace the contacts the import found, keep the ones it didn't touch.
  const replaced = new Set(proposal.contacts.map((c) => c.department.trim().toLowerCase()));
  ward.contacts = [
    ...ward.contacts.filter((c) => !replaced.has(c.department.trim().toLowerCase())),
    ...proposal.contacts.map((c) => ({ ...c, fetchedAt: c.fetchedAt ? new Date(c.fetchedAt) : new Date() })),
  ];
  await ward.save();
  return run;
}

export async function rejectContactRun(id: string) {
  const run = await ImportRun.findOneAndUpdate(
    { _id: id, kind: "contacts", status: "needs_review" },
    { $set: { status: "rejected", finishedAt: new Date() } },
    { returnDocument: "after" },
  ).lean();
  if (!run) throw new HttpError(409, "That proposal isn't waiting for review");
  return run;
}

export function serializeRun(run: IImportRun & { _id: unknown }, withProposal = false) {
  return {
    id: String(run._id),
    kind: run.kind,
    source: run.source,
    status: run.status,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt ?? null,
    summary: run.summary ?? null,
    error: run.error ?? null,
    ...(withProposal && { proposal: run.proposal ?? null }),
  };
}

export type PublicRun = ReturnType<typeof serializeRun>;
