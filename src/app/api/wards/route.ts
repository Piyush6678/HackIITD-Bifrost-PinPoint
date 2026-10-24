import { connectDB } from "@/lib/db";
import { json, route } from "@/lib/http";
import { searchParams } from "@/lib/validators";
import { Ward } from "@/models/Ward";

export const GET = route(async (req) => {
  // Boundaries are only needed for drawing ward outlines, so they're opt-in.
  const withBoundary = searchParams(req).boundary === "true";

  await connectDB();
  const wards = await Ward.find()
    .select(withBoundary ? "" : "-boundary")
    .sort({ number: 1 })
    .lean();

  return json({
    wards: wards.map((w) => ({
      id: String(w._id),
      number: w.number,
      name: w.name,
      zone: w.zone,
      ...(withBoundary && { boundary: w.boundary }),
    })),
  });
});
