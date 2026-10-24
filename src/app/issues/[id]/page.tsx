import type { Metadata } from "next";
import { Suspense } from "react";
import { IssueSkeleton, IssueView } from "@/components/issue/IssueView";

export const metadata: Metadata = { title: "Issue" };

// The page shell is static; IssueView reads the id from the URL on the client and
// fetches the issue itself. Suspense is still required because the id isn't known
// at build time.
export default function IssuePage() {
  return (
    <Suspense fallback={<IssueSkeleton />}>
      <IssueView />
    </Suspense>
  );
}
