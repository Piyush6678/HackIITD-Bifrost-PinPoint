import mongoose from "mongoose";
import { pilotWardDefs } from "../src/data/pilotWards";
import { acceptContactRun, settleContactRun, startContactRun, type ContactProposal } from "../src/lib/contactImport";
import { connectDB } from "../src/lib/db";
import { ImportRun, type IImportRun } from "../src/models/ImportRun";

// Reads each pilot ward's councillor and RTI officers from MCD's own pages with a TinyFish
// agent, and prints what it found next to what is stored.
//
//   npm run import:contacts                 all pilot wards, report only
//   npm run import:contacts -- --ward 78    one ward
//   npm run import:contacts -- --apply      also save what was found
//
// Without --apply nothing changes in the wards. The proposals also stay in the admin page's
// "Ward contacts" tab, where an admin can accept them.

const args = process.argv.slice(2);
const wardArg = args.indexOf("--ward") >= 0 ? Number(args[args.indexOf("--ward") + 1]) : undefined;
const apply = args.includes("--apply");

const POLL_MS = 6000;
const GIVE_UP_MS = 6 * 60_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  await connectDB();
  const wards = pilotWardDefs.filter((w) => !wardArg || w.number === wardArg);
  if (wards.length === 0) throw new Error(`No pilot ward ${wardArg}`);

  for (const ward of wards) {
    console.log(`\nWard ${ward.number} ${ward.name}`);
    let run: IImportRun = (await startContactRun(ward.number)).toObject();
    const started = Date.now();
    while (run.status === "running" && Date.now() - started < GIVE_UP_MS) {
      await sleep(POLL_MS);
      run = ((await settleContactRun(run)) as IImportRun | null) ?? run;
    }

    if (run.status === "running") {
      console.log("  still running after 6 minutes; check the admin page later");
      continue;
    }
    if (run.status !== "needs_review") {
      console.log(`  ${run.status}: ${run.error ?? run.summary}`);
      continue;
    }

    const proposal = run.proposal as ContactProposal;
    console.log(`  source: ${run.source}`);
    for (const c of proposal.contacts) {
      console.log(`  - ${c.department}: ${c.name ?? "(no name)"}  ${c.phone ?? ""}  ${c.email ?? ""}\n      ${c.source}`);
    }
    console.log(`  ${proposal.changes.length} new or changed`);

    if (apply) {
      await acceptContactRun(String(run._id));
      console.log("  saved");
    }
  }
  await ImportRun.syncIndexes();
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
