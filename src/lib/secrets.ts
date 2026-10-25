import { createHash, timingSafeEqual } from "node:crypto";

// Compares two secrets without leaking, through timing, how much of the guess was right.
export function safeEqual(a: string, b: string) {
  const [x, y] = [a, b].map((s) => createHash("sha256").update(s).digest());
  return timingSafeEqual(x, y);
}
