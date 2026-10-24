import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/Dashboard";

export const metadata: Metadata = { title: "Ward dashboard" };

// Logged-out visitors are sent to /login and residents see a 403 page, both by src/proxy.ts.
export default function DashboardPage() {
  return <Dashboard />;
}
