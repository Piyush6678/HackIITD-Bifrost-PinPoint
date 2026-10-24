import { requireUser, setSessionCookie } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { HttpError, json, route } from "@/lib/http";
import { User } from "@/models/User";

export const GET = route(async (req) => {
  const session = await requireUser(req);

  await connectDB();
  const user = await User.findById(session.userId).populate("ward", "name number").lean();
  if (!user) throw new HttpError(401, "Please log in first");

  const res = json({
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      ward: user.ward ?? null,
    },
  });

  // Roles can change after login (an admin makes someone an official). Re-issue the
  // cookie so page redirects in the proxy agree without making them log in again.
  if (user.role !== session.role || user.name !== session.name) {
    await setSessionCookie(res, { userId: session.userId, role: user.role, name: user.name });
  }
  return res;
});
