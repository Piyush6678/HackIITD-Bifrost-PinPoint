import { CATEGORY_RULES } from "./categories";
import { PWD_ROAD_MIN_WIDTH_FT, type Category, type RoadOwner } from "./constants";

// Which body looks after a road, from MCD's "List of Notified Roads". Everything here is
// pure, so it can be tested on sample rows.

export type NotifiedRoad = { name: string; ward: string | null; widthFt: number | null };

const ABBREVIATIONS: Record<string, string> = {
  rd: "road",
  st: "street",
  ave: "avenue",
  mg: "mahatma gandhi",
  nr: "near",
  opp: "opposite",
};

export function normaliseRoadName(name: string) {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => ABBREVIATIONS[word] ?? word)
    .join(" ");
}

// Names too short or generic to trust inside a longer address.
const tooVague = (normalised: string) => normalised.length < 6 || normalised.split(" ").length < 2;

export function roadOwnerFor(road: Pick<NotifiedRoad, "widthFt">): RoadOwner {
  return road.widthFt !== null && road.widthFt > PWD_ROAD_MIN_WIDTH_FT ? "PWD" : "MCD";
}

// An exact name match wins. Otherwise a listed road named inside the address counts, longest
// name first. Returns null unless the match is unambiguous, so a wrong owner is never shown.
export function matchRoad(candidates: (string | null | undefined)[], roads: NotifiedRoad[]) {
  const texts = candidates.filter((c): c is string => Boolean(c)).map(normaliseRoadName).filter(Boolean);
  if (texts.length === 0 || roads.length === 0) return null;

  const indexed = roads.map((road) => ({ road, key: normaliseRoadName(road.name) })).filter((r) => r.key);

  const exact = indexed.filter((r) => texts.includes(r.key));
  const pool = exact.length
    ? exact
    : indexed
        .filter((r) => !tooVague(r.key) && texts.some((t) => ` ${t} `.includes(` ${r.key} `)))
        .sort((a, b) => b.key.length - a.key.length);
  if (pool.length === 0) return null;

  const best = pool.filter((r) => r.key === pool[0].key);
  const owners = new Set(best.map((r) => roadOwnerFor(r.road)));
  if (owners.size > 1) return null;
  return { road: best[0].road, owner: [...owners][0] };
}

// "Handled by" on the issue page and in the officer's drawer.
export function handledBy(category: Category, owner: RoadOwner | null | undefined) {
  const department = CATEGORY_RULES[category].department;
  if (owner === "PWD") return "PWD (roads over 60 ft)";
  if (owner === "MCD") return "MCD Engineering";
  return category === "pothole" ? `Likely ${department}` : department;
}

export function roadLabel(name: string, owner: RoadOwner) {
  return owner === "PWD" ? `${name} (over 60 ft, PWD)` : `${name} (MCD notified road)`;
}

function toFeet(cell: string, header: string) {
  const value = Number.parseFloat(cell.replace(/,/g, ""));
  if (!Number.isFinite(value) || value <= 0) return null;
  const unit = /\b(m|mtr|mtrs|metre|metres|meter|meters)\b/i.test(`${header} ${cell}`)
    ? "m"
    : /\b(ft|feet|foot)\b|'/i.test(`${header} ${cell}`)
      ? "ft"
      : null;
  if (unit === "m") return Math.round(value * 3.28084);
  return unit === "ft" ? Math.round(value) : null;
}

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.replace(/\*\*|__/g, "").replace(/\s+/g, " ").trim());

// Reads the road tables out of a fetched page or PDF (as markdown). Columns are found by
// their headings, so the exact layout of MCD's list doesn't matter.
export function parseRoadTable(markdown: string) {
  const roads: NotifiedRoad[] = [];
  const skipped: string[] = [];
  const seen = new Set<string>();
  const lines = markdown.split(/\r?\n/);

  let cols: { name: number; ward: number; width: number; widthHeader: string } | null = null;
  for (const line of lines) {
    if (!line.trim().startsWith("|")) {
      cols = null;
      continue;
    }
    const row = cells(line);
    if (row.every((c) => /^:?-{2,}:?$/.test(c) || c === "")) continue;

    const nameAt = row.findIndex((c) => /road|street|marg|name/i.test(c) && !/^\d/.test(c));
    const looksLikeHeader = nameAt >= 0 && row.every((c) => c.length < 40) && !cols && row.some((c) => /road|street|marg|name/i.test(c));
    if (looksLikeHeader) {
      const wardAt = row.findIndex((c) => /ward/i.test(c));
      const widthAt = row.findIndex((c) => /width|r\/w|row|right of way/i.test(c));
      cols = { name: nameAt, ward: wardAt, width: widthAt, widthHeader: widthAt >= 0 ? row[widthAt] : "" };
      continue;
    }
    if (!cols) continue;

    const name = (row[cols.name] ?? "").replace(/^\d+[.)]?\s+/, "").replace(/[.,;:]+$/, "").trim();
    if (!name || /^\d+$/.test(name)) {
      skipped.push(line.trim().slice(0, 80));
      continue;
    }
    const ward = cols.ward >= 0 ? row[cols.ward] || null : null;
    const widthFt = cols.width >= 0 ? toFeet(row[cols.width] ?? "", cols.widthHeader) : null;
    const key = `${normaliseRoadName(name)}|${ward ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    roads.push({ name, ward, widthFt });
  }
  return { roads, skipped };
}
