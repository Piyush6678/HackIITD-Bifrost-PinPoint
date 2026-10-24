import { CATEGORY_RULES } from "@/lib/categories";
import { HttpError, json, route } from "@/lib/http";
import { fixAttempts, scoreIssues, scoreOfficer } from "@/lib/scorecard";
import { loadIssues, officerProfiles, wardOfficerIds } from "@/lib/scorecardData";
import { serializeIssue } from "@/lib/serialize";
import { Issue } from "@/models/Issue";
import { Ward } from "@/models/Ward";

const DAY_MS = 24 * 60 * 60 * 1000;

// Public: one ward's numbers, the officers behind them, and the evidence.
export const GET = route(async (_req, ctx: RouteContext<"/api/scorecard/[ward]">) => {
  const number = Number((await ctx.params).ward);
  if (!Number.isInteger(number)) throw new HttpError(404, "No such ward");

  const ward = await Ward.findOne({ number }).select("number name zone").lean();
  if (!ward) throw new HttpError(404, `There's no ward ${number} in the pilot`);

  const issues = await loadIssues([ward._id]);
  const now = new Date();

  // Everyone who has posted a fix here, plus whoever holds the ward now.
  const fixers = new Set(issues.flatMap((i) => fixAttempts(i.statusHistory).map((a) => a.by)));
  const profiles = await officerProfiles([...fixers]);
  const current = await officerProfiles(await wardOfficerIds(ward._id));
  const people = [...profiles, ...current.filter((c) => !fixers.has(c.id))];

  const officers = people
    .map((p) => ({
      name: p.name,
      designation: p.designation,
      // Still this ward's officer, or someone who used to post fixes here.
      current: p.current && p.wardId === String(ward._id),
      metrics: scoreOfficer(issues, p.id),
    }))
    .sort((a, b) => Number(b.current) - Number(a.current) || b.metrics.verified - a.metrics.verified);

  const [recentFixes, overdue] = await Promise.all([
    Issue.find({ ward: ward._id, status: "resolved" })
      .select("-verification -statusHistory -aiSuggestion -userChoice -upvotes")
      .sort({ resolvedAt: -1 })
      .limit(10)
      .lean(),
    Issue.find({ ward: ward._id, status: { $ne: "resolved" } })
      .select("-verification -statusHistory -aiSuggestion -userChoice -upvotes")
      .sort({ createdAt: 1 })
      .lean(),
  ]);

  return json({
    ward: { number: ward.number, name: ward.name, zone: ward.zone },
    generatedAt: now,
    metrics: scoreIssues(issues, now),
    officers,
    recentFixes: recentFixes.map((i) => ({
      ...serializeIssue(i),
      daysToFix: Math.round(((i.resolvedAt!.getTime() - i.createdAt.getTime()) / DAY_MS) * 10) / 10,
    })),
    overdue: overdue
      .map((i) => serializeIssue(i))
      .filter((i) => i.overdue)
      .map((i) => ({
        ...i,
        daysOverdue: Math.floor((now.getTime() - new Date(i.dueAt).getTime()) / DAY_MS),
        department: CATEGORY_RULES[i.category].department,
      })),
  });
});
