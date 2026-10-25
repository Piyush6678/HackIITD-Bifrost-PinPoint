import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { HttpError, json, route } from "@/lib/http";
import { findRequests, serializeRequest, wardByNumber } from "@/lib/officerRequests";
import { rateLimit } from "@/lib/rateLimit";
import { officerRequestSchema } from "@/lib/validators";
import { OfficerRequest } from "@/models/OfficerRequest";
import { User } from "@/models/User";

// The caller's most recent request, so the page can show "pending" or why it was turned down.
export const GET = route(async (req) => {
  const session = await requireUser(req);

  await connectDB();
  const latest = await findRequests({ user: session.userId }).sort({ createdAt: -1 }).lean();
  return json({ request: latest[0] ? serializeRequest(latest[0]) : null });
});

export const POST = route(async (req) => {
  const session = await requireUser(req);
  rateLimit(`officer-request:${session.userId}`, 5, 24 * 60 * 60_000);
  const input = officerRequestSchema.parse(await req.json());

  await connectDB();
  const user = await User.findById(session.userId).select("role").lean();
  if (!user) throw new HttpError(401, "Please log in first");
  if (user.role !== "citizen") throw new HttpError(409, "Your account already has staff access");

  const { wardNumber, ...details } = input;
  const ward = await wardByNumber(wardNumber);

  try {
    const created = await OfficerRequest.create({ ...details, user: session.userId, ward });
    const [request] = await findRequests({ _id: created._id }).lean();
    return json({ request: serializeRequest(request) }, 201);
  } catch (err) {
    // The partial unique index allows one pending request per person.
    if ((err as { code?: number }).code === 11000) {
      throw new HttpError(409, "You already have a request waiting for review");
    }
    throw err;
  }
});

// Withdraw a request that hasn't been looked at yet.
export const DELETE = route(async (req) => {
  const session = await requireUser(req);

  await connectDB();
  const removed = await OfficerRequest.findOneAndDelete({ user: session.userId, status: "pending" }).lean();
  if (!removed) throw new HttpError(404, "You have no pending request");
  return json({ withdrawn: true });
});
