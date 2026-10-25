"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import type { Official } from "./AdminPanel";

const HEAD = "px-4 py-2.5 text-left eyebrow font-bold text-ink-faint";

export function OfficialsTable({ officials, onChanged }: { officials: Official[]; onChanged: () => void }) {
  // Removing is a two-step click on the same row, so there's no browser confirm dialog.
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(id: string) {
    setBusy(id);
    setError(null);
    try {
      await api(`/api/admin/officials/${id}`, { method: "DELETE" });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't remove that officer.");
    } finally {
      setBusy(null);
      setConfirming(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <Alert>{error}</Alert>}
      <div className="overflow-x-auto rounded-card border border-line bg-white">
        <table className="w-full min-w-lg border-collapse">
          <thead className="border-b border-line bg-mist">
            <tr>
              <th scope="col" className={HEAD}>
                Officer
              </th>
              <th scope="col" className={HEAD}>
                Ward
              </th>
              <th scope="col" className={`${HEAD} text-right`}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {officials.map((o) => (
              <tr key={o.id} className="border-b border-line last:border-b-0">
                <td className="px-4 py-3">
                  <p className="text-sm font-bold text-ink">{o.name}</p>
                  <p className="font-mono text-xs text-ink-faint">{o.email}</p>
                </td>
                <td className="px-4 py-3 text-sm text-ink">
                  {o.ward ? (
                    <>
                      <span className="font-mono">{o.ward.number}</span> · {o.ward.name}
                    </>
                  ) : (
                    <span className="text-brick">No ward</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {confirming === o.id ? (
                    <span className="inline-flex gap-2">
                      <Button size="sm" variant="danger" loading={busy === o.id} onClick={() => remove(o.id)}>
                        Remove access
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirming(null)} disabled={busy === o.id}>
                        Keep
                      </Button>
                    </span>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setConfirming(o.id)}>
                      Remove…
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-faint">
        Removing makes them a resident again. Their past updates stay in each issue&apos;s history.
      </p>
    </div>
  );
}
