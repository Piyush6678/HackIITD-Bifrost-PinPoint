import bcrypt from "bcryptjs";
import { setSessionCookie } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { HttpError, json, route } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { registerSchema } from "@/lib/validators";
import { User } from "@/models/User";

export const POST = route(async (req) => {
  rateLimit(`register:${clientIp(req)}`, 5, 10 * 60_000);
  const { name, email, password } = registerSchema.parse(await req.json());

  await connectDB();
  if (await User.exists({ email })) {
    throw new HttpError(409, "An account with this email already exists");
  }

  const user = await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10),
  });

  const res = json({ user: { id: String(user._id), name, email, role: user.role } }, 201);
  return setSessionCookie(res, { userId: String(user._id), role: user.role, name });
});
