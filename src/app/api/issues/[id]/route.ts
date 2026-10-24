import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { HttpError, json, route } from "@/lib/http";
import { serializeIssueDetail } from "@/lib/serialize";
import { objectId } from "@/lib/validators";
import { Issue } from "@/models/Issue";

export const GET = route(async (req, ctx: RouteContext<"/api/issues/[id]">) => {
  const id = objectId((await ctx.params).id);
  const session = await getSession(req);

  await connectDB();
  const issue = await Issue.findById(id).populate("ward", "name number").lean();
  if (!issue) throw new HttpError(404, "Issue not found");

  return json({ issue: serializeIssueDetail(issue, session?.userId) });
});
