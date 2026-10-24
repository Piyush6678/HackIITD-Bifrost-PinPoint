import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export function json<T>(data: T, init?: number | ResponseInit) {
  return NextResponse.json(data, typeof init === "number" ? { status: init } : init);
}

export function toErrorResponse(err: unknown) {
  if (err instanceof HttpError) {
    return json({ error: err.message, ...err.extra }, err.status);
  }
  if (err instanceof ZodError) {
    const issues = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    return json({ error: "Invalid input", issues }, 400);
  }
  console.error(err);
  return json({ error: "Something went wrong" }, 500);
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

export function route<C>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      // Next signals things like "this route is dynamic" by throwing; let those through.
      unstable_rethrow(err);
      return toErrorResponse(err);
    }
  };
}
