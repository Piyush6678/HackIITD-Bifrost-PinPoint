import { createHash } from "node:crypto";
import { FIX_MIN_MATCH_PERCENT } from "./constants";
import { tagPhoto, type FixCheck, type PhotoProblem, type PhotoTags } from "./gemini";

// Turns Gemini's verdicts into yes/no decisions on uploads. When Gemini is off or
// fails, nothing is blocked: the GPS and time checks and residents' votes still apply.

const BLOCKED: Record<Exclude<PhotoProblem, "ok">, string> = {
  sexual: "This photo can't be used. It looks like it contains sexual content.",
  violent: "This photo can't be used. It looks like it shows graphic or violent content.",
  private_info:
    "This photo looks like it shows personal information (a document, ID, screen or someone's face). Take a photo of the problem itself.",
  unrelated: "This photo doesn't look like a civic problem in a public place. Take a photo of the problem itself.",
};

// The report flow tags the photo while the resident places the pin, then sends the
// same file again with the report. Keyed by its hash so the second look is free.
const CACHE_MS = 30 * 60_000;
const cache = new Map<string, { at: number; tags: PhotoTags }>();

export function resetPhotoScreens() {
  cache.clear();
}

export async function screenReportPhoto(photo: { data: Buffer; mimeType: string }) {
  const key = createHash("sha256").update(photo.data).digest("hex");
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < CACHE_MS) return hit.tags;

  const tags = await tagPhoto(photo);
  if (tags) {
    for (const [k, v] of cache) if (now - v.at >= CACHE_MS) cache.delete(k);
    cache.set(key, { at: now, tags });
  }
  return tags;
}

// Why a report photo is refused, or null if it's fine (or nobody could tell).
export function reportBlock(tags: PhotoTags | null) {
  if (!tags) return null;
  if (tags.photoCheck !== "ok") return BLOCKED[tags.photoCheck];
  if (!tags.looksLikeCivicIssue) return BLOCKED.unrelated;
  return null;
}

// Why an officer's after-photo is refused, or null.
export function fixBlock(check: FixCheck | null) {
  if (!check) return null;
  if (check.photoCheck !== "ok") return BLOCKED[check.photoCheck];
  if (check.matchPercent < FIX_MIN_MATCH_PERCENT) {
    return `This photo doesn't clearly show the reported problem fixed (${check.matchPercent}% match, ${FIX_MIN_MATCH_PERCENT}% needed). Take it from where the problem was, with the fix in view.`;
  }
  return null;
}
