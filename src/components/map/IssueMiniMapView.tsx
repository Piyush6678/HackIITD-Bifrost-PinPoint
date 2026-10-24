"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import type { PublicIssue } from "@/lib/serialize";
import { issuePin } from "./issuePin";

export default function IssueMiniMapView({ issue }: { issue: PublicIssue }) {
  const position: [number, number] = [issue.location.lat, issue.location.lng];

  return (
    <MapContainer
      center={position}
      zoom={16}
      minZoom={13}
      maxZoom={19}
      scrollWheelZoom={false}
      className="absolute inset-0"
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <Marker position={position} icon={issuePin(issue)} title={issue.title} alt={issue.title} />
    </MapContainer>
  );
}
