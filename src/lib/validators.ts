import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { CATEGORIES, NEARBY_MAX_RADIUS_M, STATUSES } from "./constants";
import { HttpError } from "./http";

const latN = z.number().min(-90).max(90);
const lngN = z.number().min(-180).max(180);
const lat = z.coerce.number().pipe(latN);
const lng = z.coerce.number().pipe(lngN);

// Trim before checking, so a stray space pasted with the address doesn't fail it.
const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"));

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80, "Keep it under 80 characters"),
  email,
  password: z.string().min(8, "Use at least 8 characters").max(128, "Keep it under 128 characters"),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});

const aiSuggestionSchema = z.object({
  category: z.enum(CATEGORIES),
  severity: z.coerce.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
});

// Arrives as multipart form data, so numbers come in as strings.
export const createIssueSchema = z.object({
  title: z.string().trim().min(3, "Give it a short title").max(120),
  description: z.string().trim().max(1000).optional(),
  category: z.enum(CATEGORIES),
  severity: z.coerce.number().int().min(1).max(5),
  lat,
  lng,
  address: z.string().trim().max(200).optional(),
  aiSuggestion: z
    .string()
    .optional()
    .transform((raw, ctx) => {
      if (!raw) return undefined;
      try {
        return aiSuggestionSchema.parse(JSON.parse(raw));
      } catch {
        ctx.addIssue({ code: "custom", message: "aiSuggestion is malformed" });
        return z.NEVER;
      }
    }),
});

const csv = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .optional()
    .transform((s) => (s ? s.split(",").filter(Boolean) : undefined))
    .pipe(z.array(z.enum(values)).optional());

export const listIssuesSchema = z.object({
  bbox: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(",").map(Number) : undefined))
    .pipe(
      z
        .tuple([lngN, latN, lngN, latN])
        .refine(([a, b, c, d]) => a < c && b < d, "bbox must be minLng,minLat,maxLng,maxLat")
        .optional(),
    ),
  category: csv(CATEGORIES),
  status: csv(STATUSES),
  ward: z.string().refine(isValidObjectId, "Invalid ward id").optional(),
  sort: z.enum(["recent", "upvotes", "severity"]).default("recent"),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export const nearbySchema = z.object({
  lat,
  lng,
  radius: z.coerce.number().min(10).max(NEARBY_MAX_RADIUS_M).default(250),
  category: z.enum(CATEGORIES).optional(),
  includeResolved: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

export function searchParams(req: Request) {
  return Object.fromEntries(new URL(req.url).searchParams);
}

export function objectId(id: string) {
  if (!isValidObjectId(id)) throw new HttpError(404, "Not found");
  return id;
}
