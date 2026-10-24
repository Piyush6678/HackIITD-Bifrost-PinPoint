"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import { STATUS_LABELS } from "@/lib/constants";
import { CATEGORY_LABELS, formatCoords, formatDate, formatDateTime, formatDistance } from "@/lib/format";
import type { serializeIssueDetail } from "@/lib/serialize";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";

type IssueDetail = ReturnType<typeof serializeIssueDetail>;

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; issue: IssueDetail; generatedAt: Date; liveUrl: string };

// A plain, printable record of one issue. "Save as PDF" in the browser's print dialog
// turns it into the file, so there's no PDF code here. Public information only.
export function EvidencePack() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    api<{ issue: IssueDetail }>(`/api/issues/${id}`)
      .then(({ issue }) => {
        if (!cancelled) {
          setState({ status: "ready", issue, generatedAt: new Date(), liveUrl: `${window.location.origin}/issues/${id}` });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err instanceof ApiError && err.status < 500 ? "We couldn't find that issue." : "Couldn't load the evidence pack.";
          setState({ status: "error", message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.status === "loading") return <p className="px-4 py-10 text-center text-ink-soft">Loading the evidence pack…</p>;
  if (state.status === "error") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <Alert>{state.message}</Alert>
      </div>
    );
  }

  const { issue, generatedAt, liveUrl } = state;
  const verified = issue.status === "resolved";

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-6 print:max-w-none print:px-0 print:py-0 md:py-10">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link href={`/issues/${issue.id}`} className="text-sm font-bold text-brand hover:underline">
          <span aria-hidden>←</span> Back to the issue
        </Link>
        <Button size="sm" onClick={() => window.print()}>
          Print or save as PDF
        </Button>
      </div>

      <header className="mt-6 border-b-2 border-pine pb-4 print:mt-0">
        <p className="eyebrow text-ink-faint">PinPoint · Evidence pack</p>
        <h1 className="mt-1 font-serif text-3xl font-bold leading-tight text-ink">{issue.title}</h1>
        <p className="mt-2 font-mono text-xs text-ink-faint">
          Generated {formatDateTime(generatedAt)} · Live page: {liveUrl}
        </p>
      </header>

      <Section title="Summary">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 print:grid-cols-2">
          <Fact label="Problem">{CATEGORY_LABELS[issue.category]}</Fact>
          <Fact label="Status">{STATUS_LABELS[issue.status]}</Fact>
          <Fact label="Ward">
            {issue.ward?.number ? `Ward ${issue.ward.number}${issue.ward.name ? ` · ${issue.ward.name}` : ""}` : "Not assigned"}
          </Fact>
          <Fact label="Handled by">{issue.department}</Fact>
          <Fact label="Location">
            {issue.address && <span className="block font-sans">{issue.address}</span>}
            {formatCoords(issue.location, 5)}
            <span className="block text-ink-faint">
              openstreetmap.org/?mlat={issue.location.lat.toFixed(5)}&amp;mlon={issue.location.lng.toFixed(5)}
            </span>
          </Fact>
          <Fact label="First reported">{formatDate(issue.createdAt)}</Fact>
          <Fact label="Fix was due by">{formatDate(issue.dueAt)}</Fact>
          <Fact label="Days since reported">{issue.escalation.daysSinceReported}</Fact>
          <Fact label="Days overdue">{issue.escalation.daysOverdue}</Fact>
          <Fact label="Residents affected">{issue.upvoteCount}</Fact>
          <Fact label="Fixes turned down by residents">{issue.failedVerifications}</Fact>
          <Fact label="Came back after a fix">{issue.reopenCount}</Fact>
        </dl>
        {issue.description && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{issue.description}</p>}
      </Section>

      <Section title="Why it can be escalated">
        {issue.escalation.eligible ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
            {issue.escalation.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">This issue hasn&apos;t yet met the points at which it can be escalated.</p>
        )}
      </Section>

      <Section title="Photos">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 print:grid-cols-2">
          {issue.photoUrl && (
            <Photo src={issue.photoUrl} alt={`Photo of the reported problem: ${issue.title}`} label="As reported" caption={formatDateTime(issue.createdAt)} />
          )}
          {issue.failedAttempts.map((attempt) => (
            <Photo
              key={String(attempt.failedAt)}
              src={attempt.photoUrl}
              alt="An after-photo that residents said did not show a fix"
              label="Fix turned down"
              caption={`Posted ${formatDateTime(attempt.at)}, ${formatDistance(attempt.distance)} from the spot. ${attempt.rejects} residents said it wasn't fixed; turned down ${formatDateTime(attempt.failedAt)}.`}
            />
          ))}
          {issue.resolutionPhotoUrl && issue.fix && (
            <Photo
              src={issue.resolutionPhotoUrl}
              alt="The ward officer's latest after-photo"
              label={verified ? "Fix confirmed" : "Latest fix"}
              caption={`Posted ${formatDateTime(issue.fix.at)}, ${formatDistance(issue.fix.distance)} from the spot. ${
                verified ? "Confirmed by residents." : `Waiting for residents: ${issue.verification.confirms} of ${issue.verification.needed} say fixed.`
              }`}
            />
          )}
        </div>
      </Section>

      <Section title="Timeline">
        <ol className="flex flex-col gap-3">
          {issue.statusHistory.map((entry, i) => (
            <li key={i} className="text-sm">
              <span className="font-bold text-ink">{STATUS_LABELS[entry.status]}</span>{" "}
              <span className="font-mono text-xs text-ink-faint">{formatDateTime(entry.at)}</span>
              {entry.note && <span className="block text-ink-soft">{entry.note}</span>}
            </li>
          ))}
        </ol>
      </Section>

      <p className="mt-8 border-t border-line pt-3 text-xs text-ink-faint">
        This pack holds only the public record on PinPoint. It doesn&apos;t name the resident who reported the problem or anyone who voted.
      </p>
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 break-inside-avoid">
      <h2 className="mb-3 font-serif text-xl font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="eyebrow text-ink-faint">{label}</dt>
      <dd className="mt-0.5 wrap-break-word font-mono text-[0.8125rem] text-ink">{children}</dd>
    </div>
  );
}

function Photo({ src, alt, label, caption }: { src: string | null; alt: string; label: string; caption: string }) {
  return (
    <figure className="break-inside-avoid">
      <div className="relative aspect-4/3 overflow-hidden rounded-md border border-line bg-mist">
        {src && <Image src={src} alt={alt} fill unoptimized sizes="(min-width: 768px) 360px, 100vw" className="object-cover" />}
      </div>
      <figcaption className="mt-1.5 text-xs text-ink-soft">
        <span className="font-bold text-ink">{label}.</span> {caption}
      </figcaption>
    </figure>
  );
}
