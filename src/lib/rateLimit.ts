import { HttpError } from "./http";

// In-memory sliding window. Good enough for a single instance; swap for
// Redis or a Mongo TTL collection if we ever run more than one.
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    const retryAfter = Math.ceil((windowMs - (now - recent[0])) / 1000);
    throw new HttpError(429, "Too many requests, slow down a little", { retryAfter });
  }

  recent.push(now);
  hits.set(key, recent);
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}

export function resetRateLimits() {
  hits.clear();
}
