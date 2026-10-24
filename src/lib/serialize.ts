import type { Types } from "mongoose";
import type { IIssue } from "@/models/Issue";
import { CATEGORY_RULES, isOverdue, slaDueAt } from "./categories";
import { VERIFY_VOTES_NEEDED } from "./constants";
import { escalationState } from "./escalation";
import { fromGeoPoint } from "./geo";

type WardRef = Types.ObjectId | { _id: Types.ObjectId; name: string; number: number } | undefined;

type IssueDoc = Omit<IIssue, "ward"> & { ward?: WardRef };

const photoUrl = (id?: Types.ObjectId) => (id ? `/api/photos/${id}` : null);

function wardSummary(ward: WardRef) {
  if (!ward) return null;
  if ("name" in ward) return { id: String(ward._id), name: ward.name, number: ward.number };
  return { id: String(ward), name: null, number: null };
}

// The public shape of an issue. Never includes the reporter (DPDP: we show the
// problem, not the person) or the raw voter lists.
export function serializeIssue(issue: IssueDoc, viewerId?: string) {
  return {
    id: String(issue._id),
    title: issue.title,
    description: issue.description ?? null,
    category: issue.category,
    severity: issue.severity,
    status: issue.status,
    location: fromGeoPoint(issue.location),
    address: issue.address ?? null,
    ward: wardSummary(issue.ward),
    upvoteCount: issue.upvoteCount,
    hasUpvoted: viewerId ? (issue.upvotes ?? []).some((u) => String(u) === viewerId) : false,
    photoUrl: photoUrl(issue.photo),
    resolutionPhotoUrl: photoUrl(issue.resolutionPhoto),
    portal: issue.portal?.name
      ? {
          name: issue.portal.name,
          ticketId: issue.portal.ticketId ?? null,
          expectedBy: issue.portal.expectedBy ?? null,
        }
      : null,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    resolvedAt: issue.resolvedAt ?? null,
    // Target date for a fix, from the per-category SLA in lib/categories.ts.
    dueAt: slaDueAt(issue.category, issue.createdAt),
    overdue: isOverdue(issue),
    reopenCount: issue.reopenCount ?? 0,
    failedVerifications: issue.failedVerifications ?? 0,
  };
}

export function serializeIssueDetail(issue: IssueDoc, viewerId?: string) {
  return {
    ...serializeIssue(issue, viewerId),
    department: CATEGORY_RULES[issue.category].department,
    verifyHint: CATEGORY_RULES[issue.category].verifyHint,
    verifyAfterDark: CATEGORY_RULES[issue.category].verifyAfterDark,
    aiSuggestion: issue.aiSuggestion ?? null,
    // How far from the issue the officer stood when they took the after-photo.
    fix: issue.fix?.at
      ? {
          at: issue.fix.at,
          distance: issue.fix.distance,
          accuracy: issue.fix.accuracy,
          note: issue.fix.note ?? null,
          // Advisory only; residents' votes decide.
          aiCheck: issue.fix.ai?.summary
            ? {
                samePlace: issue.fix.ai.samePlace,
                looksFixed: issue.fix.ai.looksFixed,
                confidence: issue.fix.ai.confidence,
                summary: issue.fix.ai.summary,
              }
            : null,
        }
      : null,
    // Fixes residents turned down. The photos stay as evidence; the officer isn't named here.
    failedAttempts: (issue.fixAttempts ?? []).map((a) => ({
      photoUrl: photoUrl(a.photo),
      at: a.at,
      failedAt: a.failedAt,
      distance: a.distance,
      note: a.note ?? null,
      confirms: a.confirms,
      rejects: a.rejects,
    })),
    escalation: escalationState(issue),
    verification: serializeVerification(issue),
    // Only the viewer's own vote. Who else voted is never public.
    myVote: myVote(issue, viewerId),
    statusHistory: issue.statusHistory.map(({ status, at, note }) => ({ status, at, note: note ?? null })),
  };
}

// Tallies only. Who voted is never public.
export function serializeVerification(issue: Pick<IssueDoc, "verification">) {
  return {
    confirms: issue.verification?.confirms.length ?? 0,
    rejects: issue.verification?.rejects.length ?? 0,
    needed: VERIFY_VOTES_NEEDED,
  };
}

export type PublicIssue = ReturnType<typeof serializeIssue>;

function myVote(issue: IssueDoc, viewerId?: string): "confirm" | "reject" | null {
  if (!viewerId || !issue.verification) return null;
  const mine = (votes: { user?: Types.ObjectId }[]) => votes.some((v) => String(v.user) === viewerId);
  if (mine(issue.verification.confirms)) return "confirm";
  if (mine(issue.verification.rejects)) return "reject";
  return null;
}
