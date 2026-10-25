import { z } from "zod";

// Thin wrappers over TinyFish's REST APIs (https://docs.tinyfish.ai). Everything is checked
// with Zod before the rest of the app sees it. With no key set, every call throws a
// TinyFishError with code "not_configured", so the app works without TinyFish.

const AGENT_BASE = "https://agent.tinyfish.ai";
const FETCH_URL = "https://api.fetch.tinyfish.ai";
const SEARCH_URL = "https://api.search.tinyfish.ai";

export class TinyFishError extends Error {
  constructor(
    message: string,
    public status = 0,
    public code?: string,
  ) {
    super(message);
  }
}

export const tinyFishEnabled = () => Boolean(process.env.TINYFISH_API_KEY);

async function request<T>(url: string, schema: z.ZodType<T>, init: RequestInit = {}, timeoutMs = 30_000): Promise<T> {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) throw new TinyFishError("TinyFish isn't configured. Set TINYFISH_API_KEY.", 0, "not_configured");

  const headers = new Headers(init.headers);
  headers.set("X-API-Key", apiKey);
  if (init.body) headers.set("content-type", "application/json");

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers, signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    throw new TinyFishError("Couldn't reach TinyFish", 0, "unreachable");
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = body?.error;
    throw new TinyFishError(detail?.message ?? `TinyFish answered ${res.status}`, res.status, detail?.code);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new TinyFishError("TinyFish returned something unexpected", res.status, "bad_response");
  return parsed.data;
}

const searchSchema = z.looseObject({
  results: z.array(
    z.looseObject({
      position: z.number().optional(),
      site_name: z.string().optional(),
      title: z.string().default(""),
      snippet: z.string().default(""),
      url: z.string(),
      date: z.string().optional(),
    }),
  ),
});

export type SearchResult = z.infer<typeof searchSchema>["results"][number];

// Free tier. `includeDomains` restricts results to those domains, which is how we keep
// every lookup on official sites.
export async function searchWeb(query: string, { includeDomains, purpose }: { includeDomains?: string[]; purpose?: string } = {}) {
  const params = new URLSearchParams({ query });
  if (includeDomains?.length) params.set("include_domains", includeDomains.join(","));
  if (purpose) params.set("purpose", purpose);
  params.set("location", "IN");
  const { results } = await request(`${SEARCH_URL}?${params}`, searchSchema);
  return results;
}

const fetchSchema = z.looseObject({
  results: z.array(
    z.looseObject({
      url: z.string(),
      final_url: z.string().optional(),
      title: z.string().nullable().optional(),
      published_date: z.string().nullable().optional(),
      text: z.unknown(),
    }),
  ),
  errors: z.array(z.looseObject({ url: z.string(), error: z.string() })).default([]),
});

export type FetchedPage = { url: string; title: string | null; text: string; publishedDate: string | null };

// Free tier. At most 10 URLs a call. A page that fails comes back in `errors`, not as a throw.
export async function fetchPages(urls: string[], { format = "markdown" }: { format?: "markdown" | "html" | "json" } = {}) {
  const { results, errors } = await request(
    FETCH_URL,
    fetchSchema,
    { method: "POST", body: JSON.stringify({ urls: urls.slice(0, 10), format }) },
    150_000,
  );
  const pages: FetchedPage[] = results.map((r) => ({
    url: r.final_url ?? r.url,
    title: r.title ?? null,
    text: typeof r.text === "string" ? r.text : JSON.stringify(r.text ?? ""),
    publishedDate: r.published_date ?? null,
  }));
  return { pages, errors: errors.map((e) => ({ url: e.url, error: e.error })) };
}

const startSchema = z.looseObject({
  run_id: z.string().nullable(),
  error: z.looseObject({ message: z.string().optional() }).nullable().optional(),
});

// Uses credits. Returns the run id straight away; poll getRun for the answer.
export async function startAgentRun(input: {
  url: string;
  goal: string;
  outputSchema?: Record<string, unknown>;
  maxSteps?: number;
}) {
  const { run_id, error } = await request(`${AGENT_BASE}/v1/automation/run-async`, startSchema, {
    method: "POST",
    body: JSON.stringify({
      url: input.url,
      goal: input.goal,
      output_schema: input.outputSchema,
      // Custom step limits are a beta feature; most accounts must use TinyFish's default.
      ...(input.maxSteps && { agent_config: { max_steps: input.maxSteps } }),
    }),
  });
  if (!run_id) throw new TinyFishError(error?.message ?? "TinyFish didn't start the run", 0, "not_started");
  return run_id;
}

export const RUN_STATUSES = ["PENDING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"] as const;

const runSchema = z.looseObject({
  run_id: z.string(),
  status: z.enum(RUN_STATUSES),
  result: z.unknown().nullable().optional(),
  error: z.looseObject({ message: z.string().optional() }).nullable().optional(),
});

export async function getRun(id: string) {
  const run = await request(`${AGENT_BASE}/v1/runs/${encodeURIComponent(id)}?screenshots=none&html=none`, runSchema);
  return {
    id: run.run_id,
    status: run.status,
    result: run.result ?? null,
    error: run.error?.message ?? null,
    done: run.status === "COMPLETED" || run.status === "FAILED" || run.status === "CANCELLED",
  };
}

const monitorSchema = z.looseObject({
  id: z.string(),
  name: z.string().nullable().optional(),
  type: z.string(),
  status: z.string().optional(),
});

const monitorRunSchema = z.looseObject({
  id: z.string().optional(),
  is_baseline: z.boolean().optional(),
  results: z.array(z.looseObject({})).default([]),
});

export type Monitor = z.infer<typeof monitorSchema>;
export type MonitorRun = z.infer<typeof monitorRunSchema>;

type MonitorInput = {
  name: string;
  purpose?: string;
  scheduleCron: string;
  webhookUrl?: string;
} & ({ type: "fetch"; url: string } | { type: "search"; query: string });

// Uses credits on every scheduled run, so keep the number of monitors small.
export async function createMonitor(input: MonitorInput) {
  const config = input.type === "fetch" ? { url: input.url, format: "markdown" } : { query: input.query, result_limit: 10 };
  const { monitor } = await request(
    `${AGENT_BASE}/v1/monitors`,
    z.looseObject({ monitor: monitorSchema }),
    {
      method: "POST",
      body: JSON.stringify({
        type: input.type,
        config,
        schedule_cron: input.scheduleCron,
        name: input.name,
        purpose: input.purpose,
        webhook_url: input.webhookUrl,
      }),
    },
  );
  return monitor;
}

export async function listMonitors() {
  const { monitors } = await request(`${AGENT_BASE}/v1/monitors`, z.looseObject({ monitors: z.array(monitorSchema) }));
  return monitors;
}

// Run-now results don't trigger the webhook, so callers ingest them directly.
export async function runMonitorNow(id: string) {
  const { run } = await request(
    `${AGENT_BASE}/v1/monitors/${encodeURIComponent(id)}/runs`,
    z.looseObject({ run: monitorRunSchema }),
    { method: "POST", body: "{}" },
    60_000,
  );
  return run;
}
