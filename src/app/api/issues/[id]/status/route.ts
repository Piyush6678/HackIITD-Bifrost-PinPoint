import type { UpdateQuery } from "mongoose";
import { after } from "next/server";
import { FIX_MAX_ACCURACY_M, FIX_PHOTO_MAX_AGE_MIN, FIX_RADIUS_M, type Status } from "@/lib/constants";
import { checkFix } from "@/lib/fixCheck";
import { geminiEnabled } from "@/lib/gemini";
import { notifyFixPosted, notifyWorkStarted } from "@/lib/notifications";
import { distanceInMetres, fromGeoPoint, toGeoPoint } from "@/lib/geo";
import { HttpError, json, route } from "@/lib/http";
import { requireStaff } from "@/lib/officials";
import { formFields, readPhoto } from "@/lib/photos";
import { rateLimit } from "@/lib/rateLimit";
import { serializeIssueDetail } from "@/lib/serialize";
import { objectId, statusChangeSchema } from "@/lib/validators";
import { Issue, type IIssue } from "@/models/Issue";
import { Photo } from "@/models/Photo";

// Where each status may be reached from. Officers can never set "resolved": only
// residents confirming the fix can (Phase 13). A small job like clearing garbage can
// go straight from open to fixed.
const ALLOWED_FROM: Record<"in_progress" | "pending_verification", Status[]> = {
  in_progress: ["open"],
  pending_verification: ["open", "in_progress"],
};

export const PATCH = route(async (req, ctx: RouteContext<"/api/issues/[id]/status">) => {
  const officer = await requireStaff(req, "official");
  rateLimit(`status:${officer._id}`, 30, 60 * 60_000);
  const id = objectId((await ctx.params).id);

  const form = await req.formData().catch(() => {
    throw new HttpError(400, "Send the update as multipart form data");
  });
  const input = statusChangeSchema.parse(formFields(form));

  const issue = await Issue.findById(id).select("ward status location").lean();
  if (!issue) throw new HttpError(404, "Issue not found");
  if (!officer.ward || String(issue.ward) !== String(officer.ward)) {
    throw new HttpError(403, "This issue isn't in your ward");
  }
  if (!ALLOWED_FROM[input.status].includes(issue.status)) {
    throw new HttpError(409, `This issue is already ${issue.status.replace("_", " ")}`, { status: issue.status });
  }

  const now = new Date();
  const update: UpdateQuery<IIssue> = {
    $set: { status: input.status },
    $push: { statusHistory: { status: input.status, at: now, by: officer._id, note: input.note } },
  };

  let photoId;
  if (input.status === "pending_verification") {
    const device = { lat: input.lat, lng: input.lng };
    const distance = Math.round(distanceInMetres(device, fromGeoPoint(issue.location)));

    if (input.accuracy > FIX_MAX_ACCURACY_M) {
      throw new HttpError(422, `Your GPS is only accurate to ${Math.round(input.accuracy)} m. Step into the open and try again.`);
    }
    if (distance > FIX_RADIUS_M) {
      throw new HttpError(
        422,
        `You're ${distance} m from the issue. Take the after-photo at the spot (within ${FIX_RADIUS_M} m).`,
        { distance },
      );
    }
    // The phone's clock is all we have for when the photo was taken; the server time
    // below is what goes on record.
    const age = now.getTime() - input.takenAt;
    if (age > FIX_PHOTO_MAX_AGE_MIN * 60_000 || age < -5 * 60_000) {
      throw new HttpError(422, "That photo wasn't taken just now. Take a fresh one with the camera.");
    }

    const photo = await readPhoto(form);
    photoId = (await Photo.create({ ...photo, uploadedBy: officer._id }))._id;
    update.$set = {
      ...update.$set,
      resolutionPhoto: photoId,
      fix: { by: officer._id, at: now, location: toGeoPoint(device), accuracy: input.accuracy, distance, note: input.note },
      // A fresh round of residents' votes for this fix.
      "verification.confirms": [],
      "verification.rejects": [],
    };
  }

  // Conditional on the status we checked, so two taps (or two officers) can't both win.
  const updated = await Issue.findOneAndUpdate(
    { _id: id, status: { $in: ALLOWED_FROM[input.status] } },
    update,
    { returnDocument: "after" },
  )
    .populate("ward", "name number")
    .lean();

  if (!updated) {
    if (photoId) await Photo.deleteOne({ _id: photoId });
    throw new HttpError(409, "Someone updated this issue a moment ago. Reload and check it.");
  }
  if (input.status === "in_progress") await notifyWorkStarted(updated, input.note);
  else await notifyFixPosted(updated);
  if (photoId && geminiEnabled()) {
    const afterPhoto = photoId;
    after(() => checkFix(id, afterPhoto));
  }
  return json({ issue: serializeIssueDetail(updated) });
});
