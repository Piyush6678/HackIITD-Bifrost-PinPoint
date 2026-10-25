"use client";

import "leaflet/dist/leaflet.css";
import { createLeafletContext, LeafletContext, type LeafletContextInterface } from "@react-leaflet/core";
import { Map as LeafletMapInstance, type LatLngExpression, type MapOptions } from "leaflet";
import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = MapOptions & {
  center: LatLngExpression;
  zoom: number;
  className?: string;
  children?: ReactNode;
};

// Stands in for react-leaflet's MapContainer, which removes the map when its effect
// cleans up but never makes a new one when the effect runs again on the same element.
// React does exactly that in dev (Strict Mode) and when Next shows a cached page again
// on Back, which left the layers pointing at a dead map. Here the map lives and dies
// with the effect. Like MapContainer, options are read once, when the map is created.
export function LeafletMap({ center, zoom, className, children, ...options }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const initial = useRef({ center, zoom, options });
  const [context, setContext] = useState<LeafletContextInterface | null>(null);

  useEffect(() => {
    const { center, zoom, options } = initial.current;
    const map = new LeafletMapInstance(container.current!, options).setView(center, zoom);
    // The map is an outside system; its context only exists once it has been created.
    setContext(createLeafletContext(map));
    return () => {
      setContext(null);
      map.remove();
    };
  }, []);

  return (
    <div ref={container} className={className}>
      {context && <LeafletContext value={context}>{children}</LeafletContext>}
    </div>
  );
}
