import { requireUser } from "@/lib/auth";
import { HttpError, json, route } from "@/lib/http";
import { readPhoto } from "@/lib/photos";
import { reportBlock, screenReportPhoto } from "@/lib/photoScreen";
import { rateLimit } from "@/lib/rateLimit";

// Suggests a category, severity and title for a report photo. Returns
// { suggestion: null } when AI is off or unsure, and the form just stays empty.
// `blocked` says why the photo would be refused when the report is sent.
export const POST = route(async (req) => {
  const session = await requireUser(req);
  rateLimit(`ai-tag:${session.userId}`, 20, 60 * 60_000);

  const form = await req.formData().catch(() => {
    throw new HttpError(400, "Send the photo as multipart form data");
  });
  const photo = await readPhoto(form);

  const tags = await screenReportPhoto(photo);
  const blocked = reportBlock(tags);
  return json({ suggestion: blocked ? null : tags, blocked });
});
