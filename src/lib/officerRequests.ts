import type { Types } from "mongoose";
import type { IOfficerRequest } from "@/models/OfficerRequest";
import { OfficerRequest } from "@/models/OfficerRequest";
import { Ward } from "@/models/Ward";
import { isOfficialEmail } from "./constants";
import { HttpError } from "./http";
import { makeOfficial } from "./officials";

type Populated = Omit<IOfficerRequest, "user" | "ward"> & {
  user: { _id: Types.ObjectId; name: string; email: string } | null;
  ward: { _id: Types.ObjectId; name: string; number: number } | null;
};

export function serializeRequest(r: Populated) {
  return {
    id: String(r._id),
    status: r.status,
    user: r.user ? { id: String(r.user._id), name: r.user.name, email: r.user.email } : null,
    governmentEmail: r.user ? isOfficialEmail(r.user.email) : false,
    ward: r.ward ? { id: String(r.ward._id), name: r.ward.name, number: r.ward.number } : null,
    designation: r.designation,
    department: r.department,
    employeeId: r.employeeId ?? null,
    phone: r.phone ?? null,
    note: r.note ?? null,
    reviewNote: r.reviewNote ?? null,
    reviewedAt: r.reviewedAt ?? null,
    createdAt: r.createdAt,
  };
}

export type PublicRequest = ReturnType<typeof serializeRequest>;

export function findRequests(filter: Record<string, unknown>) {
  return OfficerRequest.find(filter)
    .populate<{ user: Populated["user"] }>("user", "name email")
    .populate<{ ward: Populated["ward"] }>("ward", "name number");
}

type Review =
  | { decision: "approve"; wardNumber?: number; anyDomain: boolean; note?: string }
  | { decision: "reject"; note: string };

// Claims the pending request first, so two admins clicking at once can't both act on
// it. If promoting fails (say the account became an admin meanwhile) it goes back to pending.
export async function reviewRequest(id: string, adminId: Types.ObjectId, review: Review) {
  const decided = review.decision === "approve" ? "approved" : "rejected";
  const claimed = await OfficerRequest.findOneAndUpdate(
    { _id: id, status: "pending" },
    { $set: { status: decided, reviewedBy: adminId, reviewedAt: new Date(), reviewNote: review.note } },
    { returnDocument: "after" },
  )
    .populate<{ user: Populated["user"] }>("user", "name email")
    .populate<{ ward: Populated["ward"] }>("ward", "name number")
    .lean();

  if (!claimed) {
    const exists = await OfficerRequest.exists({ _id: id });
    throw new HttpError(exists ? 409 : 404, exists ? "This request has already been reviewed" : "No such request");
  }

  if (review.decision === "approve") {
    try {
      if (!claimed.user) throw new HttpError(404, "That account no longer exists");
      const wardNumber = review.wardNumber ?? claimed.ward?.number;
      if (!wardNumber) throw new HttpError(422, "Pick a ward for this officer");

      const { ward } = await makeOfficial(claimed.user.email, wardNumber, { anyDomain: review.anyDomain });
      if (String(ward._id) !== String(claimed.ward?._id)) {
        await OfficerRequest.updateOne({ _id: id }, { ward: ward._id });
        claimed.ward = { _id: ward._id, name: ward.name, number: ward.number };
      }
    } catch (err) {
      await OfficerRequest.updateOne(
        { _id: id },
        { $set: { status: "pending" }, $unset: { reviewedBy: 1, reviewedAt: 1, reviewNote: 1 } },
      );
      throw err;
    }
  }

  return serializeRequest(claimed);
}

export async function wardByNumber(number: number) {
  const ward = await Ward.findOne({ number }).select("_id").lean();
  if (!ward) throw new HttpError(404, `There's no ward ${number} in the pilot`);
  return ward._id;
}
