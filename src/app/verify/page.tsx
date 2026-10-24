import type { Metadata } from "next";
import { NearbyFixes } from "@/components/verify/NearbyFixes";

export const metadata: Metadata = { title: "Check fixes near you" };

export default function VerifyPage() {
  return <NearbyFixes />;
}
