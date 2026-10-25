import { createHash } from "node:crypto";
import type { Types } from "mongoose";
import { z } from "zod";
import { wardPlaceNames, ZONE_PHRASE } from "@/data/noticeSources";
import { Notice, type INotice } from "@/models/Notice";
import { Ward } from "@/models/Ward";
import type { Category } from "./constants";

// Turns what a TinyFish monitor reports into candidate notices. Everything that comes in is
// untrusted text from the web: it is checked, trimmed and stored unapproved.

export type Candidate = { title: string; summary: string; url: string; source: string; publishedAt?: Date };

const KEYWORDS: [Category, RegExp][] = [
  ["pothole", /\b(road|resurfac\w*|pothole|carriageway|asphalt|footpath|repair of road)\b/i],
  ["garbage", /\b(garbage|waste|sanitation|cleanliness|swachh\w*|sweeping|dhalao)\b/i],
  ["streetlight", /\b(street ?lights?|lighting|lamp ?post)\b/i],
  ["waterlogging", /\b(waterlogging|water logging|flooding|drain\w*|monsoon)\b/i],
  ["sewage", /\b(sewer\w*|sewage|manhole|overflow)\b/i],
  ["encroachment", /\b(encroachment|unauthori[sz]ed|anti-?encroachment)\b/i],
];

export function matchCategories(text: string) {
  return KEYWORDS.filter(([, pattern]) => pattern.test(text)).map(([category]) => category);
}

// Whether the text names one of the pilot wards, by any of its place names.
export function matchWardNumbers(text: string) {
  if (ZONE_PHRASE.test(text)) return Object.keys(wardPlaceNames).map(Number);
  const lower = text.toLowerCase();
  return Object.entries(wardPlaceNames)
    .filter(([, names]) => names.some((name) => lower.includes(name.toLowerCase())))
    .map(([number]) => Number(number));
}

const clean = (text: string, max: number) =>
  text
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`#>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

export const noticeKey = (url: string, title: string) =>
  createHash("sha1").update(`${url.trim().toLowerCase()}|${title.trim().toLowerCase()}`).digest("hex");

function hostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "official website";
  }
}

function validDate(value: unknown) {
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

const pageResult = z.looseObject({
  url: z.string(),
  final_url: z.string().optional(),
  title: z.string().nullable().optional(),
  text: z.unknown().optional(),
  published_date: z.string().nullable().optional(),
});

const searchResult = z.looseObject({
  position: z.number().optional(),
  title: z.string().default(""),
  snippet: z.string().default(""),
  url: z.string(),
  site_name: z.string().optional(),
  date: z.string().optional(),
});

// A page monitor reports the whole page. Only the lines that name a pilot ward become
// candidates, so a city-wide notice board doesn't flood the review list.
export function candidatesFromPages(results: unknown[]) {
  const out: Candidate[] = [];
  for (const raw of results) {
    const page = pageResult.safeParse(raw);
    if (!page.success || typeof page.data.text !== "string") continue;
    const url = page.data.final_url ?? page.data.url;
    for (const line of page.data.text.split(/\r?\n/)) {
      const text = clean(line, 400);
      if (text.length < 20 || matchWardNumbers(text).length === 0) continue;
      out.push({ title: text.slice(0, 200), summary: text, url, source: hostLabel(url), publishedAt: validDate(page.data.published_date) });
    }
  }
  return out;
}

// A topic monitor reports search results, with the positions of the ones that are new.
export function candidatesFromSearch(results: unknown[], newPositions?: number[]) {
  const out: Candidate[] = [];
  results.forEach((raw, index) => {
    const result = searchResult.safeParse(raw);
    if (!result.success) return;
    const position = result.data.position ?? index + 1;
    if (newPositions && newPositions.length > 0 && !newPositions.includes(position)) return;
    out.push({
      title: clean(result.data.title || result.data.snippet, 300),
      summary: clean(result.data.snippet, 600),
      url: result.data.url,
      source: result.data.site_name ?? hostLabel(result.data.url),
      publishedAt: validDate(result.data.date),
    });
  });
  return out.filter((c) => c.title.length >= 8);
}

// Saves candidates that name a pilot ward as unapproved notices. Returns how many were new.
export async function saveCandidates(candidates: Candidate[]) {
  if (candidates.length === 0) return { added: 0, seen: 0 };

  const wards = await Ward.find().select("number").lean();
  const idByNumber = new Map<number, Types.ObjectId>(wards.map((w) => [w.number, w._id]));

  let added = 0;
  for (const c of candidates) {
    const text = `${c.title} ${c.summary}`;
    const wardIds = matchWardNumbers(text)
      .map((n) => idByNumber.get(n))
      .filter((id): id is Types.ObjectId => Boolean(id));
    if (wardIds.length === 0) continue;

    const doc: Omit<INotice, "_id" | "createdAt" | "approved"> = {
      title: c.title,
      summary: c.summary === c.title ? "" : c.summary,
      url: c.url,
      source: c.source,
      publishedAt: c.publishedAt,
      wards: wardIds,
      categories: matchCategories(text),
      externalKey: noticeKey(c.url, c.title),
    };
    const result = await Notice.updateOne({ externalKey: doc.externalKey }, { $setOnInsert: { ...doc, approved: false } }, { upsert: true });
    if (result.upsertedCount) added++;
  }
  return { added, seen: candidates.length };
}

const payloadSchema = z.looseObject({
  fetch_monitor_id: z.string().optional(),
  search_monitor_id: z.string().optional(),
  is_baseline: z.boolean().optional(),
  results: z.array(z.unknown()).default([]),
  new_result_positions: z.array(z.number()).optional(),
});

// Reads a monitor webhook body, either kind. Anything that doesn't fit yields nothing.
export function candidatesFromWebhook(body: unknown) {
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return null;
  const p = parsed.data;
  if (p.search_monitor_id) return candidatesFromSearch(p.results, p.new_result_positions);
  if (p.fetch_monitor_id) return p.is_baseline ? [] : candidatesFromPages(p.results);
  return null;
}

export function serializeNotice(
  n: Pick<INotice, "title" | "summary" | "url" | "source" | "publishedAt" | "categories" | "approved" | "createdAt"> & {
    _id: unknown;
    wards: { _id: unknown; number: number; name: string }[];
  },
) {
  return {
    id: String(n._id),
    title: n.title,
    summary: n.summary,
    url: n.url,
    source: n.source,
    publishedAt: n.publishedAt ?? null,
    fetchedAt: n.createdAt,
    categories: n.categories,
    approved: n.approved,
    wards: n.wards.map((w) => ({ id: String(w._id), number: w.number, name: w.name })),
  };
}

export type PublicNotice = ReturnType<typeof serializeNotice>;
