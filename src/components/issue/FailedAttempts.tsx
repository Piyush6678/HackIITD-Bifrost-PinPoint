import Image from "next/image";
import { formatDateTime, formatDistance } from "@/lib/format";

type Attempt = {
  photoUrl: string | null;
  at: Date | string;
  failedAt: Date | string;
  distance: number;
  note: string | null;
  confirms: number;
  rejects: number;
};

// Earlier fixes that residents turned down, kept on the page as a record.
export function FailedAttempts({ attempts, title }: { attempts: Attempt[]; title: string }) {
  if (attempts.length === 0) return null;

  return (
    <section aria-labelledby="failed-heading" className="rounded-card border border-line bg-white p-4">
      <h2 id="failed-heading" className="eyebrow text-ink-faint">
        Fixes residents turned down
      </h2>
      <ul className="mt-3 flex flex-col gap-4">
        {attempts.map((attempt) => (
          <li key={String(attempt.failedAt)} className="grid grid-cols-[7rem_1fr] gap-3 sm:grid-cols-[9rem_1fr]">
            <div className="relative aspect-4/3 overflow-hidden rounded-md border border-line bg-mist">
              {attempt.photoUrl && (
                <Image
                  src={attempt.photoUrl}
                  alt={`A fix for "${title}" that residents said was not done`}
                  fill
                  unoptimized
                  sizes="144px"
                  className="object-cover"
                />
              )}
            </div>
            <div className="min-w-0 text-sm text-ink-soft">
              <p className="font-bold text-ink">
                Posted {formatDateTime(attempt.at)}, {formatDistance(attempt.distance)} from the spot
              </p>
              <p className="mt-0.5">
                {attempt.rejects} residents said it wasn&apos;t fixed
                {attempt.confirms > 0 && `, ${attempt.confirms} said it was`}. Turned down {formatDateTime(attempt.failedAt)}.
              </p>
              {attempt.note && <p className="mt-1 italic">&ldquo;{attempt.note}&rdquo;</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
