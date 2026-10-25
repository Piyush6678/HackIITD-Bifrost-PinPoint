// Written on 2026-10-25 from MCD's notified roads (https://info.mcd.gov.in/road), read by a TinyFish
// agent: the mixed-use and commercial streets listed for Karol Bagh, minus "Road No-3" and
// "Road No-6", which are too generic to match safely. MCD lists each road's ROW
// in metres; widthFt is that converted to feet. Do not edit by hand.
import type { NotifiedRoad } from "@/lib/roads";

export const roadsSource: { url: string; fetchedAt: string } | null = {"url": "https://info.mcd.gov.in/road", "fetchedAt": "2026-10-25T03:48:20.253413Z"};

export const notifiedRoads: NotifiedRoad[] = [
  {
    "name": "Guru Nanak Road",
    "ward": null,
    "widthFt": 39
  },
  {
    "name": "Master Prithvi Nath Marg (East Park Road)",
    "ward": null,
    "widthFt": 59
  },
  {
    "name": "Bank Street",
    "ward": null,
    "widthFt": 59
  },
  {
    "name": "Hardyan Singh Road",
    "ward": null,
    "widthFt": 59
  },
  {
    "name": "Bankim Chandra Chatterjee Marg",
    "ward": null,
    "widthFt": 39
  },
  {
    "name": "Maharana Pratap Market Road",
    "ward": null,
    "widthFt": 59
  },
  {
    "name": "Gurudwara Road",
    "ward": null,
    "widthFt": 79
  },
  {
    "name": "Khajoor Road",
    "ward": null,
    "widthFt": 79
  },
  {
    "name": "Tank Road",
    "ward": null,
    "widthFt": 39
  },
  {
    "name": "Ajmal Khan Road",
    "ward": null,
    "widthFt": 59
  }
];
