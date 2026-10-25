"use client";

import type { Feature, FeatureCollection, Polygon } from "geojson";
import type { LatLng, GeoJSON as LeafletGeoJSON, Path, PathOptions } from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { GeoJSON, Popup, useMap, useMapEvent } from "react-leaflet";
import { useWards } from "@/hooks/useWards";
import { WardPopup } from "./WardPopup";

type WardProps = { number: number; name: string };

const BASE: PathOptions = {
  color: "#0b4f4a",
  weight: 1.5,
  opacity: 0.7,
  dashArray: "6 6",
  fillColor: "#13a58a",
  fillOpacity: 0.03,
};

const HOVER: PathOptions = { weight: 2.5, opacity: 1, dashArray: "", fillOpacity: 0.1 };

// Below this zoom the wards are too small on screen for full names, so labels show the number only.
const NAMES_FROM_ZOOM = 14;

// `fit` frames the whole pilot area on load. Maps centred on something else
// (like the report pin) turn it off. `details` opens a ward summary on click; the
// report map leaves it off, since a click there places the pin.
export function WardLayer({ fit = true, details = false }: { fit?: boolean; details?: boolean }) {
  const map = useMap();
  const layer = useRef<LeafletGeoJSON>(null);
  const wards = useWards();
  const [open, setOpen] = useState<{ ward: WardProps; at: LatLng } | null>(null);

  const data = useMemo<FeatureCollection<Polygon, WardProps>>(
    () => ({
      type: "FeatureCollection",
      features: wards.map((w) => ({
        type: "Feature",
        id: w.id,
        properties: { number: w.number, name: w.name },
        geometry: w.boundary,
      })),
    }),
    [wards],
  );

  const syncLabels = () =>
    map.getContainer().classList.toggle("wards-compact", map.getZoom() < NAMES_FROM_ZOOM);
  useMapEvent("zoomend", syncLabels);

  useEffect(() => {
    const bounds = layer.current?.getBounds();
    if (fit && wards.length && bounds?.isValid()) map.fitBounds(bounds, { padding: [24, 24] });
    else syncLabels();
    // syncLabels only reads the map, which is already a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wards, map, fit]);

  if (!wards.length) return null;

  return (
    <>
      <GeoJSON
        // GeoJSON layers don't react to new data, so remount when the set changes.
        key={wards.map((w) => w.id).join()}
        ref={layer}
        data={data}
        style={BASE}
        onEachFeature={(feature: Feature<Polygon, WardProps>, path) => {
          const { number, name } = feature.properties;
          // Permanent labels rather than hover-only: phones have no hover.
          path.bindTooltip(`<b>${number}</b><span> ${name}</span>`, {
            permanent: true,
            direction: "center",
            className: "ward-label",
          });
          path.on({
            mouseover: () => (path as Path).setStyle(HOVER),
            mouseout: () => (path as Path).setStyle(BASE),
          });
          if (details) path.on("click", (e) => setOpen({ ward: feature.properties, at: e.latlng }));
        }}
      />
      {open && (
        <Popup
          key={open.ward.number}
          position={open.at}
          closeButton={false}
          className="issue-popup"
          eventHandlers={{ remove: () => setOpen(null) }}
        >
          <WardPopup number={open.ward.number} name={open.ward.name} />
        </Popup>
      )}
    </>
  );
}
