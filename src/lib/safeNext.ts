// Only same-site paths are allowed as a post-login destination. "//evil.com" and
// "/\evil.com" are treated as absolute URLs by browsers, so they're rejected too.
export function safeNext(next: string | null | undefined, fallback = "/") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
