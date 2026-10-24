import type { Types } from "mongoose";
import { Issue } from "@/models/Issue";
import { Photo } from "@/models/Photo";
import { connectDB } from "./db";
import { compareFix } from "./gemini";

// Runs after the officer's response has gone out, so they never wait on the model.
// Saved only if the same after-photo is still the current one: a quick rejection
// and a new fix mustn't end up with the old photo's verdict.
export async function checkFix(issueId: string, afterPhotoId: Types.ObjectId) {
  await connectDB();
  const issue = await Issue.findById(issueId).select("photo category").lean();
  if (!issue) return;

  const [before, after] = await Promise.all([
    Photo.findById(issue.photo).select("data mimeType").lean(),
    Photo.findById(afterPhotoId).select("data mimeType").lean(),
  ]);
  if (!before || !after) return;

  const verdict = await compareFix({
    before: { data: Buffer.from(before.data), mimeType: before.mimeType },
    after: { data: Buffer.from(after.data), mimeType: after.mimeType },
    category: issue.category,
  });
  if (!verdict) return;

  await Issue.updateOne(
    { _id: issueId, resolutionPhoto: afterPhotoId },
    { $set: { "fix.ai": { ...verdict, at: new Date() } } },
  );
}
