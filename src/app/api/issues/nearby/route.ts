import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { toGeoPoint } from "@/lib/geo";
import { json, route } from "@/lib/http";
import { serializeIssue, serializeVerification } from "@/lib/serialize";
import { nearbySchema, searchParams } from "@/lib/validators";
import { Issue, type IIssue } from "@/models/Issue";

// Used by the report screen: "these are already open around you".
export const GET = route(async (req) => {
  const q = nearbySchema.parse(searchParams(req));
  const session = await getSession(req);

  const query: Record<string, unknown> = {};
  if (q.category) query.category = q.category;
  // An explicit status list wins over the resolved toggle.
  if (q.status) query.status = { $in: q.status };
  else if (!q.includeResolved) query.status = { $ne: "resolved" };

  await connectDB();
  const rows = await Issue.aggregate<IIssue & { distance: number }>([
    {
      $geoNear: {
        near: toGeoPoint(q),
        distanceField: "distance",
        maxDistance: q.radius,
        spherical: true,
        query,
      },
    },
    { $limit: 50 },
    { $project: { statusHistory: 0, aiSuggestion: 0, userChoice: 0 } },
  ]);
  await Issue.populate(rows, { path: "ward", select: "name number" });

  return json({
    issues: rows.map((row) => ({
      ...serializeIssue(row, session?.userId),
      verification: serializeVerification(row),
      distance: Math.round(row.distance),
    })),
  });
});
