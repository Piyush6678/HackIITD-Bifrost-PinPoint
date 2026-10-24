import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";
import { SESSION_COOKIE, type Role } from "@/lib/constants";

// Pages only. API routes check the session (and re-check roles in the database)
// themselves, so this is a convenience redirect, not the security boundary.
const NEEDS_LOGIN = ["/report", "/dashboard"];
const NEEDS_ROLE: { base: string; roles: Role[] }[] = [{ base: "/dashboard", roles: ["official", "admin"] }];
const LOGGED_OUT_ONLY = ["/login", "/register"];

const matches = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session && NEEDS_LOGIN.some((base) => matches(pathname, base))) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  const rule = NEEDS_ROLE.find(({ base }) => matches(pathname, base));
  if (session && rule && !rule.roles.includes(session.role)) {
    // Show an explanation at the same URL instead of bouncing them somewhere confusing.
    return NextResponse.rewrite(new URL("/not-allowed", req.url), { status: 403 });
  }

  if (session && LOGGED_OUT_ONLY.includes(pathname)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/report/:path*", "/dashboard/:path*", "/login", "/register"],
};
