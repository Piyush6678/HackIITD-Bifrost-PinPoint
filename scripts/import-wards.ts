import { readFile, writeFile } from "node:fs/promises";
import mongoose from "mongoose";
import { PILOT_CENTRE, pilotWardDefs, pilotWards } from "../src/data/pilotWards";
import { connectDB } from "../src/lib/db";
import { fetchPages, searchWeb } from "../src/lib/tinyfish";
import { checkSet, describeChange, findOfficial, readWardFeatures, type Pick } from "../src/lib/wardImport";
import { ImportRun } from "../src/models/ImportRun";

// Brings official MCD ward boundaries in, to replace the simplified rectangles.
//
//   npm run import:wards                       finds candidate sources and prints them
//   npm run import:wards -- --url <geojson>    checks the file and prints what would change
//   npm run import:wards -- --file ward.geojson --write
//                                              the same, then writes src/data/wards.generated.ts
//
// Nothing is written unless every check passes and --write is given.

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] ?? true) : undefined;
};

const OFFICIAL_SOURCES = ["mcdonline.nic.in", "mcd.gov.in", "data.gov.in", "delimitation.delhi.gov.in", "github.com", "datameet.org"];

async function findCandidates() {
  const results = await searchWeb("Delhi MCD 250 wards boundary GeoJSON KML delimitation 2022 ward map", {
    includeDomains: OFFICIAL_SOURCES,
    purpose: "Find the official post-2022 MCD ward boundary file",
  });
  console.log("Candidate sources (open each, pick the one that is the 250-ward map, then re-run with --url or --file):\n");
  for (const r of results) console.log(`- ${r.title}\n  ${r.url}\n  ${r.snippet.slice(0, 160)}\n`);
  if (results.length === 0) console.log("Nothing found. Download the boundary file by hand and use --file.");
}

async function loadGeoJson(): Promise<{ data: unknown; source: string }> {
  const file = flag("file");
  if (typeof file === "string") return { data: JSON.parse(await readFile(file, "utf8")), source: `file:${file}` };

  const url = flag("url");
  if (typeof url !== "string") throw new Error("Pass --url or --file");
  try {
    const { pages, errors } = await fetchPages([url], { format: "json" });
    if (pages[0]) return { data: JSON.parse(pages[0].text), source: url };
    console.warn(`TinyFish couldn't fetch it (${errors[0]?.error ?? "no result"}); trying a direct download.`);
  } catch (err) {
    console.warn(`TinyFish fetch failed (${err instanceof Error ? err.message : err}); trying a direct download.`);
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return { data: await res.json(), source: url };
}

const round = (ring: number[][]) => ring.map(([lng, lat]) => [Number(lng.toFixed(6)), Number(lat.toFixed(6))]);

async function main() {
  if (!flag("url") && !flag("file")) return findCandidates();

  const { data, source } = await loadGeoJson();
  const { wards: official, warnings } = readWardFeatures(data);
  console.log(`Read ${official.length} wards from ${source}`);
  warnings.slice(0, 15).forEach((w) => console.log(`  note: ${w}`));
  if (warnings.length > 15) console.log(`  ...and ${warnings.length - 15} more notes`);

  const proposed: (Pick & { officialNumber: number | null; zone: string | null })[] = [];
  const problems: string[] = [];
  for (const def of pilotWardDefs) {
    const match = findOfficial(def, official);
    if (!match) {
      problems.push(`No official ward matches ${def.number} ${def.name}`);
      continue;
    }
    if (match.number !== null && match.number !== def.number) {
      console.log(`  note: ${def.name} is ward ${match.number} in the official file; PinPoint keeps ${def.number}`);
    }
    const ring = round(match.boundary.coordinates[0]);
    proposed.push({
      number: def.number,
      name: def.name,
      officialNumber: match.number,
      zone: match.zone,
      boundary: { type: "Polygon", coordinates: [ring] },
    });
  }

  problems.push(...checkSet(proposed, [{ label: "The default map centre", point: PILOT_CENTRE, wardNumber: 78 }]));

  console.log("\nWhat would change:");
  for (const p of proposed) {
    const now = pilotWards.find((w) => w.number === p.number)!;
    const c = describeChange(now.boundary, p.boundary);
    console.log(
      `  Ward ${p.number} ${p.name}: ${c.vertices.before} -> ${c.vertices.after} corners, ${c.areaKm2.before} -> ${c.areaKm2.after} km2`,
    );
  }

  if (problems.length) {
    console.log("\nProblems, so nothing will be written:");
    problems.forEach((p) => console.log(`  - ${p}`));
    process.exitCode = 1;
  } else if (flag("write")) {
    const body = `// Written by scripts/import-wards.ts on ${new Date().toISOString().slice(0, 10)}. Do not edit by hand.
// Source: ${source}

export type GeneratedWard = {
  // PinPoint's own number for the ward, and the number the official file gave it.
  number: number;
  officialNumber: number | null;
  name: string;
  zone: string | null;
  boundary: { type: "Polygon"; coordinates: number[][][] };
};

export const wardsSource: { url: string; fetchedAt: string } | null = ${JSON.stringify({ url: source, fetchedAt: new Date().toISOString() })};

export const generatedWards: GeneratedWard[] = ${JSON.stringify(proposed, null, 2)};
`;
    await writeFile(new URL("../src/data/wards.generated.ts", import.meta.url), body);
    console.log("\nWrote src/data/wards.generated.ts. Run `npm run seed:wards` to load it.");
  } else {
    console.log("\nAll checks passed. Re-run with --write to save it.");
  }

  if (process.env.MONGODB_URI) {
    await connectDB();
    await ImportRun.create({
      kind: "wards",
      source,
      status: problems.length ? "failed" : flag("write") ? "applied" : "completed",
      finishedAt: new Date(),
      summary: `${proposed.length} pilot wards matched from ${official.length}`,
      error: problems.length ? problems[0] : undefined,
    });
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
