"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Category } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { PublicNotice } from "@/lib/notices";

type Props = {
  // Limit to one ward (its id) and, optionally, the kind of issue it applies to.
  ward?: string;
  category?: Category;
  limit?: number;
  heading?: string;
};

// Approved notices from official sites that TinyFish found. Shown in amber, our colour for
// anything an agent brought in, with its source and when it was fetched. Renders nothing when
// there are none, so ordinary pages stay quiet.
export function OfficialNotices({ ward, category, limit = 3, heading = "Official notices" }: Props) {
  const [loaded, setLoaded] = useState<{ query: string; notices: PublicNotice[] } | null>(null);

  const params = new URLSearchParams({ limit: String(limit) });
  if (ward) params.set("ward", ward);
  if (category) params.set("category", category);
  const query = params.toString();

  useEffect(() => {
    let cancelled = false;
    api<{ notices: PublicNotice[] }>(`/api/notices?${query}`)
      .then(({ notices }) => !cancelled && setLoaded({ query, notices }))
      // Notices are extra context; if they can't load, the page just doesn't show them.
      .catch(() => !cancelled && setLoaded({ query, notices: [] }));
    return () => {
      cancelled = true;
    };
  }, [query]);

  if (!loaded || loaded.query !== query || loaded.notices.length === 0) return null;

  return (
    <section aria-label={heading} className="rounded-card border border-amber/30 bg-amber/8 p-4">
      <p className="eyebrow text-[#9a5c12]">{heading}</p>
      <ul className="mt-2 flex flex-col gap-3">
        {loaded.notices.map((n) => (
          <li key={n.id}>
            <a href={n.url} target="_blank" rel="noreferrer" className="text-sm font-bold leading-snug text-ink hover:underline">
              {n.title}
            </a>
            {n.summary && <p className="mt-0.5 text-sm text-ink-soft">{n.summary}</p>}
            <p className="mt-1 font-mono text-[0.6875rem] text-ink-faint">
              {n.source} · fetched {formatDate(n.fetchedAt)}
              {n.publishedAt && ` · published ${formatDate(n.publishedAt)}`}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
