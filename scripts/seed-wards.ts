import mongoose from "mongoose";
import { pilotWards } from "../src/data/pilotWards";
import { connectDB } from "../src/lib/db";
import { Issue } from "../src/models/Issue";
import { Ward } from "../src/models/Ward";

async function main() {
  await connectDB();

  for (const ward of pilotWards) {
    await Ward.updateOne({ number: ward.number }, { $set: ward }, { upsert: true });
  }
  // Make sure the geo indexes exist before the first request needs them.
  await Promise.all([Ward.syncIndexes(), Issue.syncIndexes()]);

  console.log(`Seeded ${pilotWards.length} wards`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
