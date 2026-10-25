import mongoose from "mongoose";
import { pilotWards } from "../src/data/pilotWards";
import { connectDB } from "../src/lib/db";
import { Issue } from "../src/models/Issue";
import { OfficerRequest } from "../src/models/OfficerRequest";
import { Ward } from "../src/models/Ward";

async function main() {
  await connectDB();

  for (const ward of pilotWards) {
    // Contacts come from the admin page's imports, so a reseed must not wipe them.
    const { contacts, ...rest } = ward;
    const update = contacts.length ? { $set: ward } : { $set: rest, $setOnInsert: { contacts: [] } };
    await Ward.updateOne({ number: ward.number }, update, { upsert: true });
  }
  // Make sure the geo indexes exist before the first request needs them.
  await Promise.all([Ward.syncIndexes(), Issue.syncIndexes(), OfficerRequest.syncIndexes()]);

  console.log(`Seeded ${pilotWards.length} wards`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
