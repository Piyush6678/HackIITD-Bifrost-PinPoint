import type { Types } from "mongoose";
import { requireUser } from "@/lib/auth";
import { CATEGORY_RULES, isAfterDark } from "@/lib/categories";
import { CONFIRM_RADIUS_M, FIX_MAX_ACCURACY_M, VERIFY_VOTES_NEEDED } from "@/lib/constants";
import { connectDB } from "@/lib/db";
import { distanceInMetres, fromGeoPoint } from "@/lib/geo";
import { HttpError, json, route } from "@/lib/http";
import { notifyFailed, notifyVerified } from "@/lib/notifications";
import { rateLimit } from "@/lib/rateLimit";
import { serializeIssueDetail } from "@/lib/serialize";
import { objectId, voteSchema } from "@/lib/validators";
import { Issue } from "@/models/Issue";
import { User } from "@/models/User";

// The last vote needed on either side; `.2` in Mongo means the third entry exists.
const DECIDING = VERIFY_VOTES_NEEDED - 1;

// Residents near an issue say whether the officer's fix is real. The first side to
// VERIFY_VOTES_NEEDED decides: verified (resolved), or back to the officer.
export const POST = route(async (req, ctx: RouteContext<"/api/issues/[id]/confirm">) => {
  const session = await requireUser(req);
  rateLimit(`confirm:${session.userId}`, 30, 60 * 60_000);
  const id = objectId((await ctx.params).id);
  const input = voteSchema.parse(await req.json());

  await connectDB();
  // Read fresh: a cookie can still say "citizen" for a week after someone becomes staff.
  const voter = await User.findById(session.userId).select("role").lean();
  if (!voter) throw new HttpError(401, "Please log in first");
  if (voter.role !== "citizen") throw new HttpError(403, "Ward staff can't vote on fixes. Residents decide.");

  const issue = await Issue.findById(id).select("status location category verification").lean();
  if (!issue) throw new HttpError(404, "Issue not found");
  if (issue.status !== "pending_verification") {
    throw new HttpError(409, "This issue isn't waiting for residents to check a fix", { status: issue.status });
  }
  if (hasVoted(issue.verification, session.userId)) throw new HttpError(409, "You've already voted on this fix");

  if (input.accuracy > FIX_MAX_ACCURACY_M) {
    throw new HttpError(422, `Your GPS is only accurate to ${Math.round(input.accuracy)} m. Step into the open and try again.`);
  }
  const distance = Math.round(distanceInMetres(input, fromGeoPoint(issue.location)));
  if (distance > CONFIRM_RADIUS_M) {
    throw new HttpError(422, `You're ${distance} m away. Only people within ${CONFIRM_RADIUS_M} m can check this fix.`, {
      distance,
    });
  }
  if (CATEGORY_RULES[issue.category].verifyAfterDark && !isAfterDark()) {
    throw new HttpError(422, "Streetlights can only be checked after dark, between 6:30 pm and 5:30 am.");
  }

  const now = new Date();
  const side = input.vote === "confirm" ? "confirms" : "rejects";
  // Conditional on everything we just checked, so double taps and races can't sneak a second vote in.
  const voted = await Issue.findOneAndUpdate(
    {
      _id: id,
      status: "pending_verification",
      "verification.confirms.user": { $ne: session.userId },
      "verification.rejects.user": { $ne: session.userId },
    },
    { $push: { [`verification.${side}`]: { user: session.userId, at: now } } },
    { projection: { _id: 1 } },
  );
  if (!voted) throw new HttpError(409, "This fix was decided, or you voted, a moment ago. Reload to see where it stands.");

  const outcome = await settle(id, now);

  const updated = await Issue.findById(id).populate("ward", "name number").lean();
  if (outcome && updated) {
    const refs = { ...updated, ward: updated.ward?._id };
    await (outcome === "verified" ? notifyVerified(refs) : notifyFailed(refs));
  }
  return json({ issue: serializeIssueDetail(updated!, session.userId), outcome });
});

function hasVoted(verification: { confirms: { user: Types.ObjectId }[]; rejects: { user: Types.ObjectId }[] }, userId: string) {
  return [...verification.confirms, ...verification.rejects].some((v) => String(v.user) === userId);
}

// Each transition only matches while the issue is still waiting and the deciding vote
// is really there, so exactly one request flips it however many arrive together.
async function settle(id: string, now: Date) {
  const verified = await Issue.findOneAndUpdate(
    { _id: id, status: "pending_verification", [`verification.confirms.${DECIDING}`]: { $exists: true } },
    {
      $set: { status: "resolved", resolvedAt: now },
      $push: { statusHistory: { status: "resolved", at: now, note: `Verified by ${VERIFY_VOTES_NEEDED} residents` } },
    },
    { projection: { _id: 1 } },
  );
  if (verified) return "verified" as const;

  // Back to the officer. The failed fix, with its photo, moves to fixAttempts so it stays
  // on the issue's record as evidence.
  const current = await Issue.findById(id).select("fix resolutionPhoto verification").lean();
  const attempt =
    current?.fix?.at && current.resolutionPhoto
      ? {
          by: current.fix.by,
          at: current.fix.at,
          photo: current.resolutionPhoto,
          accuracy: current.fix.accuracy,
          distance: current.fix.distance,
          note: current.fix.note,
          confirms: current.verification.confirms.length,
          rejects: current.verification.rejects.length,
          failedAt: now,
        }
      : null;

  const failed = await Issue.findOneAndUpdate(
    { _id: id, status: "pending_verification", [`verification.rejects.${DECIDING}`]: { $exists: true } },
    {
      $set: { status: "in_progress", "verification.confirms": [], "verification.rejects": [] },
      $unset: { resolutionPhoto: 1, fix: 1 },
      $inc: { failedVerifications: 1 },
      $push: {
        statusHistory: {
          status: "in_progress",
          at: now,
          note: `Verification failed: ${VERIFY_VOTES_NEEDED} residents said it isn't fixed`,
        },
        ...(attempt && { fixAttempts: attempt }),
      },
    },
    { projection: { _id: 1 } },
  );
  return failed ? ("failed" as const) : null;
}
