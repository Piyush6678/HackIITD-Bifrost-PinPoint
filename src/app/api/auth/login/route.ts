import bcrypt from "bcryptjs";
import { setSessionCookie } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { HttpError, json, route } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { loginSchema } from "@/lib/validators";
import { User } from "@/models/User";

export const POST = route(async (req) => {
  rateLimit(`login:${clientIp(req)}`, 10, 10 * 60_000);
  const { email, password } = loginSchema.parse(await req.json());

  await connectDB();
  const user = await User.findOne({ email }).select("+passwordHash");
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!user || !ok) throw new HttpError(401, "Email or password is incorrect");

  const res = json({
    user: { id: String(user._id), name: user.name, email: user.email, role: user.role },
  });
  return setSessionCookie(res, { userId: String(user._id), role: user.role, name: user.name });
});
