import { CATEGORY_RULES } from "@/lib/categories";
import { connectDB } from "@/lib/db";
import { buildPetition, buildRti, escalationState, pickContact, RTI_FEE, rtiPortal } from "@/lib/escalation";
import { fromGeoPoint } from "@/lib/geo";
import { handledBy } from "@/lib/roads";
import { HttpError, json, route } from "@/lib/http";
import { objectId } from "@/lib/validators";
import { Issue } from "@/models/Issue";
import type { IWard } from "@/models/Ward";

// Ready-to-send drafts for a resident to push an issue further. They hold issue facts
// and counts only, so the endpoint is public like the issue page itself.
export const GET = route(async (req, ctx: RouteContext<"/api/issues/[id]/escalation">) => {
  const id = objectId((await ctx.params).id);

  await connectDB();
  const issue = await Issue.findById(id)
    .populate<{ ward: Pick<IWard, "number" | "name" | "zone" | "contacts"> | null }>("ward", "name number zone contacts")
    .lean();
  if (!issue) throw new HttpError(404, "Issue not found");

  const state = escalationState(issue);
  if (!state.eligible) {
    throw new HttpError(409, "This issue hasn't reached the point where it can be escalated");
  }
  if (!issue.ward) throw new HttpError(409, "This issue isn't in a ward yet, so there's no office to write to");

  const origin = new URL(req.url).origin;
  const department = issue.roadOwner ? handledBy(issue.category, issue.roadOwner) : CATEGORY_RULES[issue.category].department;
  const facts = {
    title: issue.title,
    category: issue.category,
    address: issue.address ?? null,
    location: fromGeoPoint(issue.location),
    ward: { number: issue.ward.number, name: issue.ward.name, zone: issue.ward.zone },
    department,
    reportedAt: issue.createdAt,
    slaDays: CATEGORY_RULES[issue.category].slaDays,
    daysSinceReported: state.daysSinceReported,
    daysOverdue: state.daysOverdue,
    peopleAffected: issue.upvoteCount,
    failedChecks: issue.failedVerifications ?? 0,
    reopenCount: issue.reopenCount ?? 0,
    reasons: state.reasons,
    issueUrl: `${origin}/issues/${id}`,
    evidenceUrl: `${origin}/issues/${id}/evidence`,
    councillor: pickContact(issue.ward.contacts, /councillor/i),
    pio: pickContact(issue.ward.contacts, /\b(pio|public information)/i),
  };

  return json({
    reasons: state.reasons,
    evidenceUrl: facts.evidenceUrl,
    petition: buildPetition(facts),
    rti: { ...buildRti(facts), fee: RTI_FEE, portal: rtiPortal(department) },
  });
});
