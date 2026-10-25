import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import { connectDB } from "../src/lib/db";
import { makeOfficial } from "../src/lib/officials";
import { User } from "../src/models/User";

// Demo accounts use the reserved .test domain so nobody mistakes them for real officers.
const OFFICERS = [
  { ward: 76, name: "Rohit Mehta" },
  { ward: 77, name: "Sana Khan" },
  { ward: 78, name: "Anil Sharma" },
  { ward: 79, name: "Priya Verma" },
  { ward: 80, name: "Neha Gupta" },
  { ward: 81, name: "Deepak Singh" },
];
const ADMIN = { email: "admin@pinpoint.test", name: "PinPoint Admin" };

// With DEMO_PASSWORD set, the demo accounts' password is (re)set to it, so the script
// can be re-run to recover access. Without it, existing accounts are left alone.
const chosen = process.env.DEMO_PASSWORD;

async function upsertUser(email: string, name: string, passwordHash: string) {
  await User.updateOne(
    { email },
    chosen
      ? { $set: { passwordHash }, $setOnInsert: { email, name, role: "citizen" } }
      : { $setOnInsert: { email, name, passwordHash, role: "citizen" } },
    { upsert: true },
  );
}

async function main() {
  const password = chosen || randomBytes(9).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 10);

  await connectDB();

  for (const { ward, name } of OFFICERS) {
    const email = `ward${ward}.officer@pinpoint.test`;
    await upsertUser(email, name, passwordHash);
    await makeOfficial(email, ward, { anyDomain: true });
    console.log(`official  ${email.padEnd(32)} ward ${ward}  ${name}`);
  }

  await upsertUser(ADMIN.email, ADMIN.name, passwordHash);
  await User.updateOne({ email: ADMIN.email }, { $set: { role: "admin" }, $unset: { ward: 1 } });
  console.log(`admin     ${ADMIN.email}`);

  if (chosen) {
    console.log("\nAll demo accounts use the password from DEMO_PASSWORD.");
  } else {
    console.log(`\nPassword for new accounts: ${password}`);
    console.log("Accounts that already existed keep their old password. Set DEMO_PASSWORD to choose or reset it.");
  }
}

main()
  .catch((err) => {
    console.error(err.message ?? err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
