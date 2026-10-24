import { json, route } from "@/lib/http";
import { makeOfficial, requireStaff } from "@/lib/officials";
import { makeOfficialSchema } from "@/lib/validators";
import { User } from "@/models/User";

type WardRef = { _id: unknown; name: string; number: number } | null;

export const GET = route(async (req) => {
  await requireStaff(req, "admin");

  const officials = await User.find({ role: "official" })
    .select("name email ward")
    .populate<{ ward: WardRef }>("ward", "name number")
    .sort({ name: 1 })
    .lean();

  return json({
    officials: officials.map((o) => ({
      id: String(o._id),
      name: o.name,
      email: o.email,
      ward: o.ward ? { id: String(o.ward._id), name: o.ward.name, number: o.ward.number } : null,
    })),
  });
});

// Promotes an existing account. There's no email invite flow yet, so the officer
// registers first and an admin then gives them their ward.
export const POST = route(async (req) => {
  await requireStaff(req, "admin");
  const { email, wardNumber } = makeOfficialSchema.parse(await req.json());

  const { user, ward } = await makeOfficial(email, wardNumber);

  return json({
    official: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      ward: { id: String(ward._id), name: ward.name, number: ward.number },
    },
  });
});
