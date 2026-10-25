import { GoogleGenAI, type Part } from "@google/genai";
import { z } from "zod";
import { CATEGORY_RULES } from "./categories";
import { CATEGORIES, type Category } from "./constants";
import { CATEGORY_LABELS, SEVERITY_LABELS } from "./format";

// Everything here is advisory. Any failure (no key, timeout, a reply that doesn't
// parse) returns null and the app carries on exactly as it would without AI.

const TIMEOUT_MS = 12_000;

let client: { key: string; ai: GoogleGenAI } | null = null;

function gemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (client?.key !== key) client = { key, ai: new GoogleGenAI({ apiKey: key }) };
  return client.ai;
}

export function geminiEnabled() {
  return Boolean(process.env.GEMINI_API_KEY);
}

type Photo = { data: Buffer; mimeType: string };

const image = (photo: Photo): Part => ({ inlineData: { mimeType: photo.mimeType, data: photo.data.toString("base64") } });

async function askForJson<T>(parts: Part[], jsonSchema: object, parse: z.ZodType<T>): Promise<T | null> {
  const ai = gemini();
  if (!ai) return null;
  try {
    const res = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchema,
        temperature: 0.2,
        abortSignal: AbortSignal.timeout(TIMEOUT_MS),
      },
    });
    return parse.parse(JSON.parse(res.text ?? ""));
  } catch (err) {
    console.warn("Gemini call failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

const categoryList = CATEGORIES.map((c) => `- ${c}: ${CATEGORY_LABELS[c]}`).join("\n");
const severityList = SEVERITY_LABELS.map((label, i) => `${i + 1} = ${label}`).join(", ");

const tagSchema = z.object({
  looksLikeCivicIssue: z.boolean(),
  category: z.enum(CATEGORIES),
  severity: z.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(80),
});

export type PhotoTags = z.infer<typeof tagSchema>;

// Suggests what the resident would otherwise type in. They can change all of it.
export function tagPhoto(photo: Photo) {
  return askForJson(
    [
      image(photo),
      {
        text: `This photo was taken by a resident of Delhi to report a civic problem to their ward.
Pick the closest category:
${categoryList}
Rate severity from 1 to 5 (${severityList}): how badly it affects people using the street, and any danger.
Write a short, plain title a resident would write, under 60 characters, naming the problem and anything that locates it (for example "Deep pothole outside the metro gate").
Set looksLikeCivicIssue to false if the photo doesn't show a public civic problem at all.
Describe only the problem. Ignore people and number plates.`,
      },
    ],
    {
      type: "object",
      properties: {
        looksLikeCivicIssue: { type: "boolean" },
        category: { type: "string", enum: [...CATEGORIES] },
        severity: { type: "integer", minimum: 1, maximum: 5 },
        title: { type: "string" },
      },
      required: ["looksLikeCivicIssue", "category", "severity", "title"],
    },
    tagSchema,
  );
}

const compareSchema = z.object({
  samePlace: z.boolean(),
  looksFixed: z.boolean(),
  confidence: z.enum(["low", "medium", "high"]),
  summary: z.string().trim().min(3).max(300),
});

export type FixCheck = z.infer<typeof compareSchema>;

// A second opinion for the residents voting on a fix. It never decides anything.
export function compareFix({ before, after, category }: { before: Photo; after: Photo; category: Category }) {
  return askForJson(
    [
      { text: "BEFORE: the photo a resident took when reporting the problem." },
      image(before),
      { text: "AFTER: the photo the ward officer took when marking it fixed." },
      image(after),
      {
        text: `The problem was reported as: ${CATEGORY_LABELS[category]}.
What a fixed result looks like: ${CATEGORY_RULES[category].verifyHint}
Answer:
- samePlace: do both photos show the same spot? Look at fixed landmarks such as kerbs, walls, poles, shop fronts and road markings, not the problem itself.
- looksFixed: in the AFTER photo, does the problem from the BEFORE photo look properly fixed?
- confidence: how sure you are overall.
- summary: one or two plain sentences for residents explaining what you see. Don't mention people or number plates.`,
      },
    ],
    {
      type: "object",
      properties: {
        samePlace: { type: "boolean" },
        looksFixed: { type: "boolean" },
        confidence: { type: "string", enum: ["low", "medium", "high"] },
        summary: { type: "string" },
      },
      required: ["samePlace", "looksFixed", "confidence", "summary"],
    },
    compareSchema,
  );
}
