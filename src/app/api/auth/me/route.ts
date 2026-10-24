import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { HttpError, json, route } from "@/lib/http";
import { User } from "@/models/User";

export const GET = route(async (req) => {
  const session = await requireUser(req);

  await connectDB();
  const user = await User.findById(session.userId).populate("ward", "name number").lean();
  if (!user) throw new HttpError(401, "Please log in first");

  return json({
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      ward: user.ward ?? null,
    },
  });
});
