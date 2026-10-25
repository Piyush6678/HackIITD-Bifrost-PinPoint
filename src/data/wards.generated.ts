// Written by scripts/import-wards.ts (npm run import:wards). Empty until an import is accepted,
// in which case pilotWards.ts keeps using its simplified rectangles.

export type GeneratedWard = {
  // PinPoint's own number for the ward, and the number the official file gave it.
  number: number;
  officialNumber: number | null;
  name: string;
  zone: string | null;
  boundary: { type: "Polygon"; coordinates: number[][][] };
};

export const wardsSource: { url: string; fetchedAt: string } | null = null;

export const generatedWards: GeneratedWard[] = [];
