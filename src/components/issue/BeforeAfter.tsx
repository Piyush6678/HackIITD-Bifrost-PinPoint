"use client";

import Image from "next/image";
import { useState } from "react";
import { formatDateTime, formatDistance } from "@/lib/format";

type Props = {
  title: string;
  beforeUrl: string | null;
  afterUrl: string;
  reportedAt: Date | string;
  fix: { at: Date | string; distance: number; note: string | null };
};

type Side = "before" | "after";

// Side by side on wide screens; a two-tab toggle on phones, where two photos
// would each be too small to judge.
export function BeforeAfter({ title, beforeUrl, afterUrl, reportedAt, fix }: Props) {
  const [side, setSide] = useState<Side>("after");

  return (
    <section aria-label="Before and after">
      {beforeUrl && (
        <div role="tablist" aria-label="Photo" className="mb-3 grid grid-cols-2 rounded-md bg-mist p-1 md:hidden">
          {(["before", "after"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={side === value}
              onClick={() => setSide(value)}
              className={`h-8 rounded text-sm font-bold transition-colors ${
                side === value ? "bg-white text-pine shadow-card" : "text-ink-faint"
              }`}
            >
              {value === "before" ? "Before" : "After"}
            </button>
          ))}
        </div>
      )}

      <div className={`grid gap-4 ${beforeUrl ? "md:grid-cols-2" : ""}`}>
        {beforeUrl && (
          <Photo
            className={side === "before" ? "block" : "hidden md:block"}
            src={beforeUrl}
            alt={`Photo of the reported problem: ${title}`}
            label="Before"
            caption={`Reported ${formatDateTime(reportedAt)}`}
          />
        )}
        <Photo
          className={beforeUrl && side === "before" ? "hidden md:block" : "block"}
          src={afterUrl}
          alt={`The ward officer's after-photo for: ${title}`}
          label="After"
          caption={`Taken ${formatDateTime(fix.at)}, ${formatDistance(fix.distance)} from the reported spot`}
          note={fix.note}
        />
      </div>
    </section>
  );
}

function Photo({
  src,
  alt,
  label,
  caption,
  note,
  className,
}: {
  src: string;
  alt: string;
  label: string;
  caption: string;
  note?: string | null;
  className: string;
}) {
  return (
    <figure className={className}>
      <div className="relative aspect-4/3 overflow-hidden rounded-card border border-line bg-mist">
        <Image
          src={src}
          alt={alt}
          fill
          unoptimized
          sizes="(min-width: 1024px) 320px, (min-width: 768px) 45vw, 100vw"
          className="object-cover"
        />
        <span className="absolute left-2 top-2 rounded bg-ink/70 px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wider text-white">
          {label}
        </span>
      </div>
      <figcaption className="mt-2 text-sm text-ink-soft">
        {caption}
        {note && <span className="mt-1 block">&ldquo;{note}&rdquo;</span>}
      </figcaption>
    </figure>
  );
}
