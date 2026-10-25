import type { Metadata } from "next";
import { OfficerAccess } from "@/components/officer/OfficerAccess";

export const metadata: Metadata = { title: "Request officer access" };

// Behind login (src/proxy.ts). Anyone can ask; only an admin can say yes.
export default function OfficerAccessPage() {
  return <OfficerAccess />;
}
