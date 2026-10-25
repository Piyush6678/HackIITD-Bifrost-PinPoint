import type { QueueIssue } from "@/hooks/useQueue";
import { CATEGORY_LABELS, formatHours } from "@/lib/format";
import { CategoryIcon } from "../issue/CategoryIcon";
import { SeverityMeter } from "../issue/SeverityMeter";
import { StatusPill } from "../issue/StatusPill";

type Props = {
  issues: QueueIssue[];
  selectedId?: string;
  onSelect: (issue: QueueIssue) => void;
};

const HEAD = "px-3 py-2.5 text-left eyebrow font-bold text-ink-faint";

export function QueueTable({ issues, selectedId, onSelect }: Props) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-white">
      <table className="w-full min-w-160 border-collapse">
        <caption className="sr-only">Issues in your ward, highest priority first</caption>
        <thead className="border-b border-line bg-mist">
          <tr>
            <th scope="col" className={`${HEAD} w-12`}>
              #
            </th>
            <th scope="col" className={HEAD}>
              Issue
            </th>
            <th scope="col" className={`${HEAD} hidden md:table-cell`}>
              Category
            </th>
            <th scope="col" className={HEAD}>
              Severity
            </th>
            <th scope="col" className={`${HEAD} text-right`}>
              Affected
            </th>
            <th scope="col" className={`${HEAD} text-right`}>
              Age
            </th>
            <th scope="col" className={HEAD}>
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue, i) => (
            <tr
              key={issue.id}
              onClick={() => onSelect(issue)}
              className={`cursor-pointer border-b border-line last:border-b-0 transition-colors hover:bg-mist/60 ${
                issue.id === selectedId ? "bg-mist" : ""
              }`}
            >
              <td className="px-3 py-3 font-mono text-xs text-ink-faint">{i + 1}</td>
              <td className="max-w-72 px-3 py-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(issue);
                  }}
                  className="block w-full truncate text-left text-sm font-bold text-ink hover:text-brand"
                >
                  {issue.title}
                </button>
                {issue.overdue && <span className="mt-0.5 block text-[0.6875rem] font-bold text-brick">Overdue</span>}
                {issue.escalationRisk && (
                  <span className="mt-0.5 block text-[0.6875rem] font-bold text-brick">
                    {issue.escalationRisk === "eligible" ? "Residents can escalate this" : "At risk of escalation"}
                  </span>
                )}
                {issue.failedVerifications > 0 && (
                  <span className="mt-0.5 block text-[0.6875rem] font-bold text-brick">
                    Verification failed {issue.failedVerifications}×
                  </span>
                )}
              </td>
              <td className="hidden px-3 py-3 md:table-cell">
                <span className="flex items-center gap-1.5 text-sm text-ink-soft">
                  <CategoryIcon category={issue.category} className="size-4" />
                  {CATEGORY_LABELS[issue.category]}
                </span>
              </td>
              <td className="px-3 py-3">
                <SeverityMeter value={issue.severity} showLabel={false} />
              </td>
              <td className="px-3 py-3 text-right font-mono text-sm text-ink">{issue.upvoteCount}</td>
              <td
                className={`px-3 py-3 text-right font-mono text-sm ${issue.overdue ? "font-medium text-brick" : "text-ink"}`}
              >
                {formatHours(issue.hoursOpen)}
              </td>
              <td className="px-3 py-3">
                <StatusPill status={issue.status} size="sm" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
