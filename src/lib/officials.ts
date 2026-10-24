import { User } from "@/models/User";
import { Ward } from "@/models/Ward";
import { requireUser } from "./auth";
import { isOfficialEmail, OFFICIAL_EMAIL_DOMAINS, type Role } from "./constants";
import { connectDB } from "./db";
import { HttpError } from "./http";

// The role inside the session cookie can be up to a week old. Anything only staff
// may do re-reads it from the database, so a demoted official loses access at once.
export async function requireStaff(req: Request, ...roles: Role[]) {
  const session = await requireUser(req);

  await connectDB();
  const user = await User.findById(session.userId).select("name email role ward").lean();
  if (!user) throw new HttpError(401, "Please log in first");
  if (!roles.includes(user.role)) throw new HttpError(403, "You don't have access to this");

  return user;
}

export async function makeOfficial(email: string, wardNumber: number, { anyDomain = false } = {}) {
  if (!anyDomain && !isOfficialEmail(email)) {
    throw new HttpError(422, `Officials need a government email address (${OFFICIAL_EMAIL_DOMAINS.join(" or ")})`);
  }

  await connectDB();
  const ward = await Ward.findOne({ number: wardNumber }).select("name number").lean();
  if (!ward) throw new HttpError(404, `There's no ward ${wardNumber} in the pilot`);

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) throw new HttpError(404, "No account uses that email yet. Ask them to register first, then try again.");
  if (user.role === "admin") throw new HttpError(409, "That account is an admin; admins aren't tied to a ward");

  user.role = "official";
  user.ward = ward._id;
  await user.save();

  return { user, ward };
}

export async function removeOfficial(userId: string) {
  await connectDB();
  const user = await User.findOneAndUpdate(
    { _id: userId, role: "official" },
    { $set: { role: "citizen" }, $unset: { ward: 1 } },
    { returnDocument: "after" },
  ).lean();
  if (!user) throw new HttpError(404, "No official with that id");
  return user;
}
