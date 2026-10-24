import type { Metadata } from "next";
import { AdminPanel } from "@/components/admin/AdminPanel";

export const metadata: Metadata = { title: "Admin" };

// Admins only, by src/proxy.ts for the page and requireStaff() in every API it calls.
export default function AdminPage() {
  return <AdminPanel />;
}
