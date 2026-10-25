import mongoose from "mongoose";
import { parseArgs } from "node:util";
import { connectDB } from "../src/lib/db";
import { makeOfficial, removeOfficial } from "../src/lib/officials";
import { User } from "../src/models/User";

const USAGE = `Usage:
  npm run set-role -- --email someone@mcd.nic.in --role official --ward 78
  npm run set-role -- --email someone@example.com --role admin
  npm run set-role -- --email someone@example.com --role citizen
Add --any-domain to make a non-government address an official (demo accounts only).`;

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    role: { type: "string" },
    ward: { type: "string" },
    "any-domain": { type: "boolean", default: false },
  },
});

async function main() {
  const { email, role, ward } = values;
  if (!email || !role) throw new Error(USAGE);

  await connectDB();

  if (role === "official") {
    if (!ward) throw new Error("Officials need a ward: --ward 78");
    const { user, ward: w } = await makeOfficial(email, Number(ward), { anyDomain: values["any-domain"] });
    return console.log(`${user.email} is now the official for ward ${w.number} (${w.name})`);
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new Error(`No account uses ${email}`);

  if (role === "admin") {
    await User.updateOne({ _id: user._id }, { $set: { role: "admin" }, $unset: { ward: 1 } });
  } else if (role === "citizen") {
    if (user.role === "official") await removeOfficial(String(user._id));
    else await User.updateOne({ _id: user._id }, { $set: { role: "citizen" } });
  } else {
    throw new Error(`Unknown role "${role}"\n\n${USAGE}`);
  }
  console.log(`${user.email} is now ${role === "admin" ? "an admin" : "a resident"}`);
}

main()
  .catch((err) => {
    console.error(err.message ?? err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
