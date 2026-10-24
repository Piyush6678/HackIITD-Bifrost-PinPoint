"use client";

import Link from "next/link";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Draft } from "@/lib/escalation";
import { Alert } from "../ui/Alert";
import { Button, buttonClasses } from "../ui/Button";

type Drafts = {
  petition: Draft;
  rti: Draft & { fee: string; portal: { name: string; url: string } };
};

type Which = "petition" | "rti";

type Props = {
  issueId: string;
  escalation: { reasons: string[]; daysSinceReported: number; daysOverdue: number };
};

// Shown only once an issue has been stuck long enough to escalate. The drafts are fetched
// when someone asks for them, so ordinary visits never build them.
export function EscalatePanel({ issueId, escalation }: Props) {
  const [drafts, setDrafts] = useState<Drafts | null>(null);
  const [which, setWhich] = useState<Which | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function show(next: Which) {
    if (which === next) return setWhich(null);
    setWhich(next);
    if (drafts) return;
    setLoading(true);
    setError(null);
    try {
      setDrafts(await api<Drafts>(`/api/issues/${issueId}/escalation`));
    } catch (err) {
      setWhich(null);
      setError(err instanceof ApiError ? err.message : "Couldn't prepare the draft. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="escalate-heading" className="rounded-card border border-brick/30 bg-brick/5 p-4">
      <p className="eyebrow text-brick">Escalate</p>
      <h2 id="escalate-heading" className="mt-1 font-serif text-lg font-bold leading-snug text-ink">
        This has waited long enough to take further
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
        {escalation.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/issues/${issueId}/evidence`}
          target="_blank"
          className={buttonClasses({ variant: "secondary", size: "sm" })}
        >
          Evidence pack
        </Link>
        <Button variant={which === "petition" ? "primary" : "secondary"} size="sm" onClick={() => show("petition")}>
          Councillor petition
        </Button>
        <Button variant={which === "rti" ? "primary" : "secondary"} size="sm" onClick={() => show("rti")}>
          RTI application
        </Button>
      </div>

      <div className="mt-4" aria-live="polite">
        {error && <Alert>{error}</Alert>}
        {loading && <p className="text-sm text-ink-soft">Preparing your draft…</p>}
        {which && drafts && <DraftView draft={drafts[which]} rti={which === "rti" ? drafts.rti : null} />}
      </div>
    </section>
  );
}

function DraftView({ draft, rti }: { draft: Draft; rti: Drafts["rti"] | null }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`To: ${draft.to}\nSubject: ${draft.subject}\n\n${draft.body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the text is selectable on screen.
    }
  }

  return (
    <div className="rounded-md border border-line bg-white p-3">
      <p className="text-xs text-ink-faint">
        <span className="font-bold text-ink">To:</span> {draft.to}
      </p>
      <p className="mt-0.5 text-xs text-ink-faint">
        <span className="font-bold text-ink">Subject:</span> {draft.subject}
      </p>
      <pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink">
        {draft.body}
      </pre>

      {rti && (
        <p className="mt-3 border-t border-line pt-3 text-xs text-ink-soft">
          Application fee: {rti.fee}. File it on the{" "}
          <a href={rti.portal.url} target="_blank" rel="noreferrer" className="font-bold text-brand hover:underline">
            {rti.portal.name}
          </a>{" "}
          or post it to the office above. Fill in your own name and address before sending.
        </p>
      )}

      <div className="mt-3">
        <Button size="sm" onClick={copy} aria-live="polite">
          {copied ? "Copied" : "Copy text"}
        </Button>
      </div>
    </div>
  );
}
