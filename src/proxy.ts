import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/constants";

// Pages only. API routes check the session themselves, so this is a convenience
// redirect, not the security boundary.
const NEEDS_LOGIN = ["/report", "/dashboard"];
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

  if (session && LOGGED_OUT_ONLY.includes(pathname)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/report/:path*", "/dashboard/:path*", "/login", "/register"],
};
