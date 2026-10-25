import { requireUser } from "@/lib/auth";
import { tagPhoto } from "@/lib/gemini";
import { HttpError, json, route } from "@/lib/http";
import { readPhoto } from "@/lib/photos";
import { rateLimit } from "@/lib/rateLimit";

// Suggests a category, severity and title for a report photo. Returns
// { suggestion: null } when AI is off or unsure, and the form just stays empty.
export const POST = route(async (req) => {
  const session = await requireUser(req);
  rateLimit(`ai-tag:${session.userId}`, 20, 60 * 60_000);

  const form = await req.formData().catch(() => {
    throw new HttpError(400, "Send the photo as multipart form data");
  });
  const photo = await readPhoto(form);

  return json({ suggestion: await tagPhoto(photo) });
});
