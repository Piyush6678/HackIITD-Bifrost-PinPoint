import { SignJWT, jwtVerify } from "jose";
import type { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_TTL_DAYS, type Role } from "./constants";
import { HttpError } from "./http";

export type Session = { userId: string; role: Role; name: string };

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) throw new Error("JWT_SECRET must be at least 32 characters");
  return new TextEncoder().encode(value);
}

export async function signSession(session: Session) {
  return new SignJWT({ role: session.role, name: session.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_DAYS}d`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return { userId: payload.sub, role: payload.role as Role, name: payload.name as string };
  } catch {
    return null;
  }
}

function readCookie(req: Request, name: string) {
  const header = req.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
}

export async function getSession(req: Request) {
  const token = readCookie(req, SESSION_COOKIE);
  return token ? verifySession(token) : null;
}

export async function requireUser(req: Request) {
  const session = await getSession(req);
  if (!session) throw new HttpError(401, "Please log in first");
  return session;
}

export async function requireRole(req: Request, ...roles: Role[]) {
  const session = await requireUser(req);
  if (!roles.includes(session.role)) throw new HttpError(403, "You don't have access to this");
  return session;
}

export async function setSessionCookie(res: NextResponse, session: Session) {
  res.cookies.set(SESSION_COOKIE, await signSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
  return res;
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
