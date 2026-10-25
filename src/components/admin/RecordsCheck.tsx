"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { RecordHit } from "@/lib/recordsCheck";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";

type Result = { hits: RecordHit[]; nameFoundOn: number; domains: string[] };

// A hint for the admin, not a verdict: what MCD and Delhi government pages say about this
// person, with links. Shown in amber because TinyFish did the looking.
export function RecordsCheck({ requestId }: { requestId: string }) {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      setResult(await api<Result>(`/api/admin/officer-requests/${requestId}/check`, { method: "POST" }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't check the public records.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-t border-line px-5 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="secondary" onClick={run} loading={loading}>
          {result ? "Check again" : "Check public records"}
        </Button>
        <p className="text-xs text-ink-faint">Searches only MCD and Delhi government sites. It&apos;s a hint; you decide.</p>
      </div>

      <div aria-live="polite">
        {error && (
          <div className="mt-3">
            <Alert>{error}</Alert>
          </div>
        )}

        {result && (
          <div className="mt-3 rounded-md border border-amber/30 bg-amber/8 p-3">
            <p className="eyebrow text-[#9a5c12]">Found by TinyFish</p>
            {result.hits.length === 0 ? (
              <p className="mt-1.5 text-sm text-ink-soft">
                Nothing on official sites. That isn&apos;t proof either way: many staff aren&apos;t listed online.
              </p>
            ) : (
              <>
                <p className="mt-1.5 text-sm text-ink">
                  Name found on {result.nameFoundOn} of {result.hits.length} pages.
                </p>
                <ul className="mt-2 flex flex-col gap-3">
                  {result.hits.map((hit) => (
                    <li key={hit.url}>
                      <a href={hit.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-brand hover:underline">
                        {hit.title || hit.url}
                      </a>
                      <p className="font-mono text-[0.6875rem] text-ink-faint">{hit.url}</p>
                      <p className={`mt-0.5 text-xs font-bold ${hit.nameFound ? "text-brand" : "text-ink-faint"}`}>
                        {hit.nameFound ? "Name appears on this page" : "Name not on this page"}
                      </p>
                      {hit.context && <p className="mt-0.5 border-l-2 border-amber/40 pl-2 text-xs text-ink-soft">…{hit.context}…</p>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
