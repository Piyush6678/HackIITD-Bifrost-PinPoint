import type { Metadata } from "next";
import { Suspense } from "react";
import { WardScorecard, WardSkeleton } from "@/components/scorecard/WardScorecard";

export const metadata: Metadata = { title: "Ward scorecard" };

// Like the issue page: the ward number is read on the client, so Suspense is needed.
export default function WardScorecardPage() {
  return (
    <Suspense fallback={<WardSkeleton />}>
      <WardScorecard />
    </Suspense>
  );
}
