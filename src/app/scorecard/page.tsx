import type { Metadata } from "next";
import { CityScorecard } from "@/components/scorecard/CityScorecard";

export const metadata: Metadata = { title: "Ward scorecard" };

export default function ScorecardPage() {
  return <CityScorecard />;
}
