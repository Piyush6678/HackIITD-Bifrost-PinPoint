import { readFile, writeFile } from "node:fs/promises";
import mongoose from "mongoose";
import { connectDB } from "../src/lib/db";
import { parseRoadTable } from "../src/lib/roads";
import { fetchPages, searchWeb } from "../src/lib/tinyfish";
import { ImportRun } from "../src/models/ImportRun";

// Brings in MCD's "List of Notified Roads", so road-damage reports can say whether MCD or PWD
// looks after the road.
//
//   npm run import:roads                       finds where the list is published
//   npm run import:roads -- --url <page-or-pdf>   reads it and prints what it found
//   npm run import:roads -- --url <...> --write   the same, then saves src/data/notifiedRoads.generated.ts
//
// Review the printed sample before using --write.

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] ?? true) : undefined;
};

async function findSource() {
  const results = await searchWeb("List of Notified Roads in MCD Delhi", {
    includeDomains: ["mcdonline.nic.in", "mcd.gov.in", "mcd.nic.in"],
    purpose: "Find MCD's official list of notified roads",
  });
  console.log("Where the list may be (open each, then re-run with --url):\n");
  for (const r of results) console.log(`- ${r.title}\n  ${r.url}\n  ${r.snippet.slice(0, 160)}\n`);
  if (results.length === 0) console.log("Nothing found. Look for it under MCD's website by hand and pass --url or --file.");
}

async function main() {
  const file = flag("file");
  const url = flag("url");
  if (typeof file !== "string" && typeof url !== "string") return findSource();

  let text: string;
  let source: string;
  if (typeof file === "string") {
    text = await readFile(file, "utf8");
    source = `file:${file}`;
  } else {
    const { pages, errors } = await fetchPages([url as string]);
    if (!pages[0]) throw new Error(`Couldn't read ${url}: ${errors[0]?.error ?? "no result"}`);
    text = pages[0].text;
    source = pages[0].url;
  }

  const { roads, skipped } = parseRoadTable(text);
  console.log(`Read ${roads.length} roads from ${source}`);
  console.log(`  with a ward: ${roads.filter((r) => r.ward).length}, with a width: ${roads.filter((r) => r.widthFt !== null).length}`);
  console.log(`  rows skipped: ${skipped.length}`);
  console.log("\nSample:");
  for (const r of roads.slice(0, 12)) console.log(`  ${r.name}${r.ward ? ` | ward ${r.ward}` : ""}${r.widthFt ? ` | ${r.widthFt} ft` : ""}`);

  if (roads.length === 0) {
    console.log("\nNo road table found. The start of the text was:\n");
    console.log(text.slice(0, 800));
    process.exitCode = 1;
  } else if (flag("write")) {
    const body = `// Written by scripts/import-roads.ts on ${new Date().toISOString().slice(0, 10)}. Do not edit by hand.
// Source: ${source}
import type { NotifiedRoad } from "@/lib/roads";

export const roadsSource: { url: string; fetchedAt: string } | null = ${JSON.stringify({ url: source, fetchedAt: new Date().toISOString() })};

export const notifiedRoads: NotifiedRoad[] = ${JSON.stringify(roads, null, 2)};
`;
    await writeFile(new URL("../src/data/notifiedRoads.generated.ts", import.meta.url), body);
    console.log("\nWrote src/data/notifiedRoads.generated.ts");
  } else {
    console.log("\nRe-run with --write to save it.");
  }

  if (process.env.MONGODB_URI) {
    await connectDB();
    await ImportRun.create({
      kind: "roads",
      source,
      status: roads.length === 0 ? "failed" : flag("write") ? "applied" : "completed",
      finishedAt: new Date(),
      summary: `${roads.length} roads read`,
      error: roads.length === 0 ? "No road table found" : undefined,
    });
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
