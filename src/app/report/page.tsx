import type { Metadata } from "next";
import { ReportFlow } from "@/components/report/ReportFlow";

export const metadata: Metadata = { title: "Report an issue" };

// Logged-out visitors never get here: src/proxy.ts sends them to /login first.
export default function ReportPage() {
  return <ReportFlow />;
}
