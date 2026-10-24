import type { Metadata } from "next";
import { IssueView } from "@/components/issue/IssueView";

export const metadata: Metadata = { title: "Issue" };

export default async function IssuePage(props: PageProps<"/issues/[id]">) {
  const { id } = await props.params;
  return <IssueView id={id} />;
}
