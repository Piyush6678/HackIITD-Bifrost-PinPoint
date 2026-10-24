import type { Metadata } from "next";
import { Suspense } from "react";
import { IssueSkeleton, IssueView } from "@/components/issue/IssueView";

export const metadata: Metadata = { title: "Issue" };

// The id is only known at request time, so reading it has to sit inside Suspense
// for the rest of the page shell to prerender.
export default function IssuePage({ params }: PageProps<"/issues/[id]">) {
  return (
    <Suspense fallback={<IssueSkeleton />}>
      <IssueById params={params} />
    </Suspense>
  );
}

async function IssueById({ params }: { params: PageProps<"/issues/[id]">["params"] }) {
  const { id } = await params;
  return <IssueView id={id} />;
}
