import { connectDB } from "@/lib/db";
import { HttpError, json, route } from "@/lib/http";
import { candidatesFromWebhook, saveCandidates } from "@/lib/notices";
import { safeEqual } from "@/lib/secrets";
import { ImportRun } from "@/models/ImportRun";

const MAX_BODY_BYTES = 2 * 1024 * 1024;

// Where TinyFish monitors report changes. Their webhooks aren't signed, so the shared secret
// travels in the address they were created with (?secret=...), and the payload is treated as
// untrusted text: whatever it holds is stored unapproved, for an admin to review.
export const POST = route(async (req) => {
  const expected = process.env.TINYFISH_WEBHOOK_SECRET;
  if (!expected) throw new HttpError(503, "The notices webhook isn't configured");

  const given = new URL(req.url).searchParams.get("secret") ?? req.headers.get("x-webhook-secret") ?? "";
  if (!safeEqual(given, expected)) throw new HttpError(401, "Wrong or missing secret");

  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) throw new HttpError(413, "Payload too large");
  const candidates = candidatesFromWebhook(await req.json().catch(() => null));
  if (!candidates) throw new HttpError(400, "That isn't a TinyFish monitor payload");

  await connectDB();
  const { added, seen } = await saveCandidates(candidates);
  await ImportRun.create({
    kind: "notices",
    source: "TinyFish monitor webhook",
    status: "completed",
    finishedAt: new Date(),
    summary: `${added} new of ${seen} candidates`,
  });

  return json({ received: seen, added });
});
