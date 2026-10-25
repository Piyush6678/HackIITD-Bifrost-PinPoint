// Written by scripts/import-roads.ts (npm run import:roads). Empty until an import is
// accepted, in which case road ownership stays unknown and issues keep the generic department.
import type { NotifiedRoad } from "@/lib/roads";

export const roadsSource: { url: string; fetchedAt: string } | null = null;

export const notifiedRoads: NotifiedRoad[] = [];
