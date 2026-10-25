// Thin fetch wrapper for our own API. Every error response from the server has
// the shape { error, issues? }, so callers get one exception type to handle.

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    // Field-level validation messages, keyed by field name.
    public fields: Record<string, string> = {},
    public data?: unknown,
  ) {
    super(message);
  }
}

type Options = RequestInit & { json?: unknown };

export async function api<T>(path: string, { json, ...init }: Options = {}): Promise<T> {
  const headers = new Headers(init.headers);
  let body = init.body;
  if (json !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(json);
  }

  let res: Response;
  try {
    res = await fetch(path, { ...init, headers, body, credentials: "same-origin" });
  } catch {
    throw new ApiError(0, "Can't reach PinPoint right now. Check your connection and try again.");
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const fields: Record<string, string> = {};
    for (const issue of data?.issues ?? []) fields[issue.path] ??= issue.message;
    throw new ApiError(res.status, data?.error ?? "Something went wrong", fields, data);
  }
  return data as T;
}
