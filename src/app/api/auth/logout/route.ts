import { clearSessionCookie } from "@/lib/auth";
import { json } from "@/lib/http";

export async function POST() {
  return clearSessionCookie(json({ ok: true }));
}
