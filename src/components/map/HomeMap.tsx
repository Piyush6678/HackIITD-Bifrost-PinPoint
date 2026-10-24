"use client";

import dynamic from "next/dynamic";
import { MapPlaceholder } from "./MapPlaceholder";

// Leaflet touches `window` as soon as it's imported, so it can only run in the browser.
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <MapPlaceholder />,
});

export function HomeMap() {
  return <MapView />;
}
