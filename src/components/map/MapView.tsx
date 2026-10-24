"use client";

import type { LatLngBoundsExpression } from "leaflet";
import { TileLayer, ZoomControl } from "react-leaflet";
import { LeafletMap } from "./LeafletMap";
import { PILOT_CENTRE } from "@/data/pilotWards";
import { IssueLayer } from "./IssueLayer";
import { WardLayer } from "./WardLayer";

// Roughly Delhi. Keeps people from panning off into an empty map by accident.
const CITY_BOUNDS: LatLngBoundsExpression = [
  [28.4, 76.84],
  [28.89, 77.35],
];

export default function MapView() {
  return (
    <LeafletMap
      center={[PILOT_CENTRE.lat, PILOT_CENTRE.lng]}
      zoom={14}
      minZoom={12}
      maxZoom={19}
      maxBounds={CITY_BOUNDS}
      maxBoundsViscosity={0.8}
      zoomControl={false}
      className="absolute inset-0"
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <WardLayer />
      <IssueLayer />
      <ZoomControl position="bottomright" />
    </LeafletMap>
  );
}
