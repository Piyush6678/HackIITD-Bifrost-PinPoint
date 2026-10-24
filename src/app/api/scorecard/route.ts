import { json, route } from "@/lib/http";
import { compareWards, scoreIssues, type Metrics } from "@/lib/scorecard";
import { loadIssues } from "@/lib/scorecardData";
import { scorecardSchema, searchParams } from "@/lib/validators";
import { Ward } from "@/models/Ward";

const SORTS: Record<"acceptance" | "speed" | "overdue", (a: Metrics, b: Metrics) => number> = {
  acceptance: compareWards,
  speed: (a, b) => (a.medianDaysToFix ?? Infinity) - (b.medianDaysToFix ?? Infinity) || compareWards(a, b),
  overdue: (a, b) => b.overdue - a.overdue || compareWards(a, b),
};

// Public: every pilot ward's record side by side.
export const GET = route(async (req) => {
  const { sort } = scorecardSchema.parse(searchParams(req));

  const [issues, wards] = await Promise.all([loadIssues(), Ward.find().select("number name zone").lean()]);
  const now = new Date();

  const rows = wards.map((ward) => ({
    ward: { number: ward.number, name: ward.name, zone: ward.zone },
    metrics: scoreIssues(
      issues.filter((i) => String(i.ward) === String(ward._id)),
      now,
    ),
  }));
  rows.sort((a, b) => SORTS[sort](a.metrics, b.metrics));

  return json({ generatedAt: now, sort, wards: rows, city: scoreIssues(issues, now) });
});
