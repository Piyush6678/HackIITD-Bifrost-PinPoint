import mongoose from "mongoose";
import { connectDB } from "../src/lib/db";
import { Issue } from "../src/models/Issue";

// How often residents kept what Gemini suggested. Compares aiSuggestion with
// userChoice on every report that had a suggestion.
async function main() {
  await connectDB();
  const issues = await Issue.find({ "aiSuggestion.category": { $exists: true } })
    .select("aiSuggestion userChoice")
    .lean();

  if (issues.length === 0) {
    console.log("No reports with an AI suggestion yet.");
    return;
  }

  let sameCategory = 0;
  let sameSeverity = 0;
  let severityGap = 0;
  for (const { aiSuggestion, userChoice } of issues) {
    if (aiSuggestion!.category === userChoice.category) sameCategory += 1;
    if (aiSuggestion!.severity === userChoice.severity) sameSeverity += 1;
    severityGap += Math.abs(aiSuggestion!.severity - userChoice.severity);
  }

  const pct = (n: number) => `${Math.round((n / issues.length) * 100)}%`;
  console.log(`Reports with a suggestion: ${issues.length}`);
  console.log(`Category kept:             ${pct(sameCategory)}`);
  console.log(`Severity kept:             ${pct(sameSeverity)}`);
  console.log(`Average severity change:   ${(severityGap / issues.length).toFixed(2)} steps`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
