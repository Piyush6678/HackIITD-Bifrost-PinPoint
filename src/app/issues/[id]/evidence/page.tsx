import type { Metadata } from "next";
import { Suspense } from "react";
import { EvidencePack } from "@/components/issue/EvidencePack";

export const metadata: Metadata = { title: "Evidence pack" };

// Same shape as the issue page: the id is read on the client, so Suspense is needed.
export default function EvidencePage() {
  return (
    <Suspense fallback={<p className="px-4 py-10 text-center text-ink-soft">Loading the evidence pack…</p>}>
      <EvidencePack />
    </Suspense>
  );
}
