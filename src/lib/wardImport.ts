import { pointInPolygon, pointInRing, type LatLng } from "./geo";

// Turns an official ward-boundary file (GeoJSON) into the polygons PinPoint stores, and
// checks them before anything is used. Pure functions, so they can be tested on samples.

export type Polygon = { type: "Polygon"; coordinates: number[][][] };
export type OfficialWard = { number: number | null; name: string; zone: string | null; boundary: Polygon };

// Delhi and a margin. Anything outside this is not a Delhi ward.
const DELHI = { minLng: 76.7, maxLng: 77.5, minLat: 28.3, maxLat: 29.0 };

const NUMBER_KEYS = ["ward_no", "wardno", "ward_number", "wardnumber", "ward_num", "ward_n", "ward", "no"];
const NAME_KEYS = ["ward_name", "wardname", "ward_nm", "name", "name_en"];
const ZONE_KEYS = ["zone", "zone_name", "zonename", "zone_nm"];

function pick(props: Record<string, unknown>, keys: string[]) {
  const lowered = new Map(Object.entries(props).map(([k, v]) => [k.toLowerCase().replace(/[\s-]/g, "_"), v]));
  for (const key of keys) {
    const value = lowered.get(key);
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return undefined;
}

export function normaliseName(name: string) {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\bward\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const areaOf = (ring: number[][]) => {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) sum += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  return Math.abs(sum) / 2;
};

const looksLikeLatLng = (ring: number[][]) =>
  ring.length > 0 &&
  ring.every(([a, b]) => a >= DELHI.minLat && a <= DELHI.maxLat && b >= DELHI.minLng && b <= DELHI.maxLng);

// Keeps just [lng, lat], closes the ring, and puts swapped [lat, lng] pairs back in order.
function cleanRing(ring: unknown, notes: string[], label: string): number[][] | null {
  if (!Array.isArray(ring)) return null;
  let points = ring
    .filter((p): p is number[] => Array.isArray(p) && typeof p[0] === "number" && typeof p[1] === "number")
    .map((p) => [p[0], p[1]]);
  if (points.length < 3) return null;
  if (looksLikeLatLng(points)) {
    points = points.map(([a, b]) => [b, a]);
    notes.push(`${label}: coordinates were [lat, lng]; swapped to [lng, lat]`);
  }
  const [first, last] = [points[0], points[points.length - 1]];
  if (first[0] !== last[0] || first[1] !== last[1]) points.push([...first]);
  return points;
}

function toPolygon(geometry: unknown, notes: string[], label: string): Polygon | null {
  const g = geometry as { type?: string; coordinates?: unknown } | null;
  if (!g || !Array.isArray(g.coordinates)) return null;

  let rings: unknown = null;
  if (g.type === "Polygon") rings = g.coordinates;
  if (g.type === "MultiPolygon") {
    // A ward is stored as one polygon, so keep the biggest piece and say what was dropped.
    const parts = (g.coordinates as unknown[][]).map((poly) => poly).filter((poly) => Array.isArray(poly));
    const sized = parts.map((poly) => ({ poly, size: areaOf(((poly[0] ?? []) as number[][]) ?? []) }));
    sized.sort((a, b) => b.size - a.size);
    if (sized.length > 1) notes.push(`${label}: had ${sized.length} separate pieces; kept the largest`);
    rings = sized[0]?.poly;
  }
  if (!Array.isArray(rings)) return null;

  const cleaned = (rings as unknown[]).map((r, i) => cleanRing(r, notes, `${label} ring ${i}`));
  if (cleaned.some((r) => r === null) || cleaned.length === 0) return null;
  return { type: "Polygon", coordinates: cleaned as number[][][] };
}

export function readWardFeatures(geojson: unknown) {
  const warnings: string[] = [];
  const features = (geojson as { features?: unknown[] } | null)?.features;
  if (!Array.isArray(features)) return { wards: [] as OfficialWard[], warnings: ["The file isn't a GeoJSON FeatureCollection"] };

  const wards: OfficialWard[] = [];
  features.forEach((feature, i) => {
    const f = feature as { properties?: Record<string, unknown>; geometry?: unknown };
    const props = f?.properties ?? {};
    const rawName = pick(props, NAME_KEYS);
    const rawNumber = pick(props, NUMBER_KEYS);
    const number = rawNumber === undefined ? null : Number.parseInt(String(rawNumber).replace(/\D+/g, ""), 10);
    const label = `Feature ${i + 1}${rawName ? ` (${rawName})` : ""}`;

    const boundary = toPolygon(f?.geometry, warnings, label);
    if (!boundary) return void warnings.push(`${label}: no usable polygon, skipped`);
    if (!rawName && !Number.isFinite(number)) return void warnings.push(`${label}: no ward name or number, skipped`);

    wards.push({
      number: Number.isFinite(number) ? number : null,
      name: rawName ? String(rawName).trim() : `Ward ${number}`,
      zone: pick(props, ZONE_KEYS) ? String(pick(props, ZONE_KEYS)).trim() : null,
      boundary,
    });
  });
  return { wards, warnings };
}

const orient = (a: number[], b: number[], c: number[]) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));

function crosses(a: number[], b: number[], c: number[], d: number[]) {
  const [o1, o2, o3, o4] = [orient(a, b, c), orient(a, b, d), orient(c, d, a), orient(c, d, b)];
  return o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0 && o1 !== o2 && o3 !== o4;
}

// True if two non-neighbouring edges cross, which MongoDB rejects as an invalid shape.
export function selfIntersects(ring: number[][]) {
  const n = ring.length - 1;
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (crosses(ring[i], ring[i + 1], ring[j], ring[j + 1])) return true;
    }
  }
  return false;
}

export function validateBoundary(boundary: Polygon, label: string) {
  const problems: string[] = [];
  const [outer] = boundary.coordinates;
  if (outer.length < 4) problems.push(`${label}: fewer than 3 distinct points`);
  if (outer.some(([lng, lat]) => lng < DELHI.minLng || lng > DELHI.maxLng || lat < DELHI.minLat || lat > DELHI.maxLat)) {
    problems.push(`${label}: has points outside Delhi, so the order may be wrong`);
  }
  if (selfIntersects(outer)) problems.push(`${label}: the outline crosses itself`);
  return problems;
}

function bounds(ring: number[][]) {
  const lngs = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  return { minLng: Math.min(...lngs), maxLng: Math.max(...lngs), minLat: Math.min(...lats), maxLat: Math.max(...lats) };
}

// Fraction of the smaller ward's area that sits inside the other, by sampling a grid.
export function overlapShare(a: Polygon, b: Polygon, steps = 40) {
  const box = bounds(a.coordinates[0]);
  let inA = 0;
  let inBoth = 0;
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < steps; j++) {
      const point = {
        lng: box.minLng + ((i + 0.5) / steps) * (box.maxLng - box.minLng),
        lat: box.minLat + ((j + 0.5) / steps) * (box.maxLat - box.minLat),
      };
      if (!pointInRing(point, a.coordinates[0])) continue;
      inA++;
      if (pointInRing(point, b.coordinates[0])) inBoth++;
    }
  }
  return inA === 0 ? 0 : inBoth / inA;
}

export type Pick = { number: number; name: string; boundary: Polygon };

export function checkSet(wards: Pick[], known: { label: string; point: LatLng; wardNumber: number }[]) {
  const problems: string[] = [];
  for (const w of wards) problems.push(...validateBoundary(w.boundary, `Ward ${w.number} ${w.name}`));

  for (let i = 0; i < wards.length; i++) {
    for (let j = i + 1; j < wards.length; j++) {
      const share = Math.max(overlapShare(wards[i].boundary, wards[j].boundary), overlapShare(wards[j].boundary, wards[i].boundary));
      if (share > 0.05) {
        problems.push(
          `Ward ${wards[i].number} and ward ${wards[j].number} overlap by about ${Math.round(share * 100)}% of the smaller one`,
        );
      }
    }
  }

  for (const k of known) {
    const home = wards.find((w) => w.number === k.wardNumber);
    if (!home) problems.push(`${k.label}: ward ${k.wardNumber} is missing`);
    else if (!pointInPolygon(k.point, home.boundary)) problems.push(`${k.label} no longer falls in ward ${k.wardNumber}`);
    else {
      const other = wards.find((w) => w.number !== k.wardNumber && pointInPolygon(k.point, w.boundary));
      if (other) problems.push(`${k.label} falls in ward ${other.number} as well as ${k.wardNumber}`);
    }
  }
  return problems;
}

// Matches a pilot ward to the official list by name first, then by number.
export function findOfficial(pilot: { number: number; name: string }, official: OfficialWard[]) {
  const wanted = normaliseName(pilot.name);
  return (
    official.find((w) => normaliseName(w.name) === wanted) ?? official.find((w) => w.number !== null && w.number === pilot.number)
  );
}

export function describeChange(before: Polygon, after: Polygon) {
  const [b, a] = [before.coordinates[0], after.coordinates[0]];
  const area = (ring: number[][]) => areaOf(ring) * Math.cos((28.65 * Math.PI) / 180) * 111.32 * 111.32;
  return {
    vertices: { before: b.length - 1, after: a.length - 1 },
    areaKm2: { before: Number(area(b).toFixed(2)), after: Number(area(a).toFixed(2)) },
  };
}
