import { json, route } from "@/lib/http";
import { findRequests, serializeRequest } from "@/lib/officerRequests";
import { requireStaff } from "@/lib/officials";
import { listRequestsSchema, searchParams } from "@/lib/validators";

export const GET = route(async (req) => {
  await requireStaff(req, "admin");
  const { status } = listRequestsSchema.parse(searchParams(req));

  // Pending ones oldest first, so nobody waits at the bottom; decided ones newest first.
  const requests = await findRequests({ status })
    .sort({ createdAt: status === "pending" ? 1 : -1 })
    .limit(200)
    .lean();
  return json({ requests: requests.map(serializeRequest) });
});
