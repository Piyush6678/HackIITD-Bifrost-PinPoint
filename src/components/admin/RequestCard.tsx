"use client";

import { useState } from "react";
import { useWards } from "@/hooks/useWards";
import { api, ApiError } from "@/lib/api";
import { formatDate, timeAgo } from "@/lib/format";
import type { PublicRequest } from "@/lib/officerRequests";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Select, TextArea } from "../ui/Field";

type Props = { request: PublicRequest; onDecided: () => void };

export function RequestCard({ request, onDecided }: Props) {
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");
  const r = request;

  return (
    <article className="rounded-card border border-line bg-white">
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
        <div className="min-w-0">
          <h2 className="font-bold text-ink">{r.user?.name ?? "Deleted account"}</h2>
          <p className="truncate font-mono text-[0.8125rem] text-ink-soft">{r.user?.email}</p>
        </div>
        {r.governmentEmail ? (
          <span className="rounded-full bg-mint/12 px-2.5 py-0.5 text-xs font-bold text-brand">
            Government email
          </span>
        ) : (
          <span className="rounded-full bg-amber/12 px-2.5 py-0.5 text-xs font-bold text-amber">Personal email</span>
        )}
      </header>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4 sm:grid-cols-3">
        <Meta label="Ward asked for">{r.ward ? `Ward ${r.ward.number} · ${r.ward.name}` : "—"}</Meta>
        <Meta label="Designation">{r.designation}</Meta>
        <Meta label="Department">{r.department}</Meta>
        <Meta label="Employee id" mono>
          {r.employeeId ?? "Not given"}
        </Meta>
        <Meta label="Phone" mono>
          {r.phone ?? "Not given"}
        </Meta>
        <Meta label="Sent">{timeAgo(r.createdAt)}</Meta>
      </dl>

      {r.note && (
        <p className="mx-5 mb-4 border-l-2 border-line pl-3 text-sm leading-relaxed text-ink-soft">{r.note}</p>
      )}

      {r.status !== "pending" ? (
        <footer className="border-t border-line px-5 py-3 text-sm text-ink-soft">
          <span className={`font-bold ${r.status === "approved" ? "text-brand" : "text-brick"}`}>
            {r.status === "approved" ? "Approved" : "Rejected"}
          </span>
          {r.reviewedAt && ` on ${formatDate(r.reviewedAt)}`}
          {r.reviewNote && <span> · &ldquo;{r.reviewNote}&rdquo;</span>}
        </footer>
      ) : mode === "approve" ? (
        <ApproveForm request={r} onCancel={() => setMode("idle")} onDone={onDecided} />
      ) : mode === "reject" ? (
        <RejectForm request={r} onCancel={() => setMode("idle")} onDone={onDecided} />
      ) : (
        <footer className="flex gap-2 border-t border-line px-5 py-3">
          <Button size="sm" onClick={() => setMode("approve")}>
            Approve…
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setMode("reject")}>
            Reject…
          </Button>
        </footer>
      )}
    </article>
  );
}

type FormProps = { request: PublicRequest; onCancel: () => void; onDone: () => void };

function useDecision(id: string, onDone: () => void) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(json: unknown) {
    setPending(true);
    setError(null);
    try {
      await api(`/api/admin/officer-requests/${id}`, { method: "PATCH", json });
      onDone();
    } catch (err) {
      const e = err instanceof ApiError ? err : new ApiError(0, "Something went wrong");
      setError(Object.values(e.fields)[0] ?? e.message);
      setPending(false);
    }
  }
  return { pending, error, send };
}

function ApproveForm({ request, onCancel, onDone }: FormProps) {
  const wards = useWards();
  const [wardNumber, setWardNumber] = useState(String(request.ward?.number ?? ""));
  const [vouched, setVouched] = useState(false);
  const { pending, error, send } = useDecision(request.id, onDone);
  const needsVouch = !request.governmentEmail;

  return (
    <div className="flex flex-col gap-4 border-t border-line bg-mist/50 px-5 py-4">
      {error && <Alert>{error}</Alert>}
      <Select label="Make them the officer for" value={wardNumber} onChange={(e) => setWardNumber(e.target.value)}>
        {wards.length === 0 && request.ward && (
          <option value={request.ward.number}>
            Ward {request.ward.number} · {request.ward.name}
          </option>
        )}
        {wards.map((w) => (
          <option key={w.id} value={w.number}>
            Ward {w.number} · {w.name}
          </option>
        ))}
      </Select>

      {needsVouch && (
        <label className="flex items-start gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={vouched}
            onChange={(e) => setVouched(e.target.checked)}
            className="mt-0.5 size-4 accent-pine"
          />
          <span>
            This isn&apos;t a government email. I&apos;ve confirmed who they are another way (employee id, a call to
            their office).
          </span>
        </label>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          loading={pending}
          disabled={needsVouch && !vouched}
          onClick={() => send({ decision: "approve", wardNumber: Number(wardNumber), anyDomain: needsVouch && vouched })}
        >
          Approve as Ward {wardNumber} officer
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function RejectForm({ request, onCancel, onDone }: FormProps) {
  const [note, setNote] = useState("");
  const { pending, error, send } = useDecision(request.id, onDone);

  return (
    <div className="flex flex-col gap-4 border-t border-line bg-mist/50 px-5 py-4">
      {error && <Alert>{error}</Alert>}
      <TextArea
        label="Reason (they will see this)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="e.g. Couldn't match the employee id with Ward 78's office"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="danger"
          loading={pending}
          disabled={note.trim().length < 3}
          onClick={() => send({ decision: "reject", note })}
        >
          Reject request
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function Meta({ label, mono = false, children }: { label: string; mono?: boolean; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="eyebrow text-ink-faint">{label}</dt>
      <dd className={`mt-1 truncate text-ink ${mono ? "font-mono text-[0.8125rem]" : "text-sm"}`}>{children}</dd>
    </div>
  );
}
