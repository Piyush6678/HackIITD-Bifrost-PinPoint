import type { Types } from "mongoose";
import type { IIssue } from "@/models/Issue";
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
  };
}

export function serializeIssueDetail(issue: IssueDoc, viewerId?: string) {
  return {
    ...serializeIssue(issue, viewerId),
    aiSuggestion: issue.aiSuggestion ?? null,
    verification: {
      confirms: issue.verification?.confirms.length ?? 0,
      rejects: issue.verification?.rejects.length ?? 0,
    },
    statusHistory: issue.statusHistory.map(({ status, at, note }) => ({ status, at, note: note ?? null })),
  };
}

export type PublicIssue = ReturnType<typeof serializeIssue>;
