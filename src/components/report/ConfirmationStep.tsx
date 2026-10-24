import Link from "next/link";
import type { PublicIssue } from "@/lib/serialize";
import { buttonClasses } from "../ui/Button";

type Props = { issue: PublicIssue; reopenedAfterDays?: number | null };

export function ConfirmationStep({ issue, reopenedAfterDays = null }: Props) {
  const reopened = reopenedAfterDays !== null;

  return (
    <section aria-labelledby="done-heading" className="flex flex-col items-center py-6 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-mint/15 text-brand">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-7" aria-hidden>
          <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <h1 id="done-heading" className="mt-5 font-serif text-[1.75rem] font-bold leading-tight text-ink">
        {reopened ? "Reported again" : "Report submitted"}
      </h1>
      {reopened ? (
        <p className="mt-2 max-w-sm text-ink-soft">
          <strong className="text-ink">{issue.title}</strong> was marked fixed {reopenedAfterDays}{" "}
          {reopenedAfterDays === 1 ? "day" : "days"} ago. Your report reopened it, and the failed fix now counts on
          the ward&apos;s record.
        </p>
      ) : (
        <p className="mt-2 max-w-sm text-ink-soft">
          <strong className="text-ink">{issue.title}</strong> is on the map
          {issue.ward?.number ? ` for Ward ${issue.ward.number}` : ""}. Share the link so neighbours can add their voice.
        </p>
      )}

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href={`/issues/${issue.id}`} className={buttonClasses()}>
          View your report
        </Link>
        <Link href="/" className={buttonClasses({ variant: "secondary" })}>
          Back to the map
        </Link>
      </div>
    </section>
  );
}
