"use client";

import { divIcon, type LeafletEvent, type Marker as LeafletMarker } from "leaflet";
import { useEffect } from "react";
import { Circle, Marker, TileLayer, useMap, useMapEvent } from "react-leaflet";
import { PILOT_CENTRE } from "@/data/pilotWards";
import type { LatLng } from "@/lib/geo";
import { LeafletMap } from "../map/LeafletMap";
import { WardLayer } from "../map/WardLayer";

export type PickedPlace = LatLng & { accuracy: number | null; source: "gps" | "manual" };

type Props = {
  value: PickedPlace | null;
  // Bumped by the parent when the map should jump to `value` (a fresh GPS fix),
  // as opposed to every drag, which shouldn't move the map.
  focus: number;
  onPick: (point: LatLng) => void;
  onCentreChange: (point: LatLng) => void;
};

const pinIcon = divIcon({
  className: "",
  html: '<span class="picker-pin"></span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

export default function LocationPickerMap({ value, focus, onPick, onCentreChange }: Props) {
  const start = value ?? PILOT_CENTRE;

  return (
    <LeafletMap center={[start.lat, start.lng]} zoom={value ? 17 : 14} minZoom={12} maxZoom={19} className="absolute inset-0">
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <WardLayer fit={false} />
      <MapBehaviour value={value} focus={focus} onPick={onPick} onCentreChange={onCentreChange} />

      {value?.source === "gps" && value.accuracy && (
        <Circle
          center={[value.lat, value.lng]}
          radius={value.accuracy}
          pathOptions={{ color: "#13a58a", weight: 1, fillColor: "#13a58a", fillOpacity: 0.12 }}
        />
      )}
      {value && (
        <Marker
          position={[value.lat, value.lng]}
          icon={pinIcon}
          draggable
          title="Problem location"
          alt="Problem location"
          eventHandlers={{
            dragend: (e: LeafletEvent) => onPick((e.target as LeafletMarker).getLatLng()),
          }}
        />
      )}
    </LeafletMap>
  );
}

function MapBehaviour({ value, focus, onPick, onCentreChange }: Props) {
  const map = useMap();

  useMapEvent("click", (e) => onPick(e.latlng));
  useMapEvent("moveend", () => onCentreChange(map.getCenter()));

  useEffect(() => {
    if (focus && value) map.setView([value.lat, value.lng], Math.max(map.getZoom(), 17));
    // Only a new focus request moves the map; `value` changes on every drag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, map]);

  return null;
}
