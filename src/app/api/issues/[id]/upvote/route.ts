import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { HttpError, json, route } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";
import { objectId } from "@/lib/validators";
import { Issue } from "@/models/Issue";

type Ctx = RouteContext<"/api/issues/[id]/upvote">;

// Both directions are conditional updates, so double-clicks and races can't
// push the count out of step with the array.
async function setUpvote(req: Request, ctx: Ctx, on: boolean) {
  const session = await requireUser(req);
  rateLimit(`upvote:${session.userId}`, 60, 60_000);
  const id = objectId((await ctx.params).id);

  await connectDB();
  const updated = on
    ? await Issue.findOneAndUpdate(
        { _id: id, status: { $ne: "resolved" }, upvotes: { $ne: session.userId } },
        { $push: { upvotes: session.userId }, $inc: { upvoteCount: 1 } },
        { returnDocument: "after", projection: { upvoteCount: 1 } },
      )
    : await Issue.findOneAndUpdate(
        { _id: id, upvotes: session.userId },
        { $pull: { upvotes: session.userId }, $inc: { upvoteCount: -1 } },
        { returnDocument: "after", projection: { upvoteCount: 1 } },
      );

  if (updated) return json({ upvoteCount: updated.upvoteCount, hasUpvoted: on });

  // Nothing changed: either it was already in the requested state, or the issue is gone/closed.
  const issue = await Issue.findById(id, { upvoteCount: 1, status: 1, upvotes: 1 }).lean();
  if (!issue) throw new HttpError(404, "Issue not found");
  if (on && issue.status === "resolved") throw new HttpError(409, "This issue is already resolved");

  const hasUpvoted = issue.upvotes.some((u) => String(u) === session.userId);
  return json({ upvoteCount: issue.upvoteCount, hasUpvoted });
}

export const POST = route((req, ctx: Ctx) => setUpvote(req, ctx, true));
export const DELETE = route((req, ctx: Ctx) => setUpvote(req, ctx, false));
