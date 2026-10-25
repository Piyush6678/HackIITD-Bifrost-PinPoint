"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWards, wardAt } from "@/hooks/useWards";
import { formatCoords, formatDistance } from "@/lib/format";
import type { LatLng } from "@/lib/geo";
import { MapPlaceholder } from "../map/MapPlaceholder";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import type { PickedPlace } from "./LocationPickerMap";
import type { ReportPhoto } from "./PhotoStep";

const LocationPickerMap = dynamic(() => import("./LocationPickerMap"), {
  ssr: false,
  loading: () => <MapPlaceholder />,
});

type GpsState = "idle" | "locating" | "ok" | "denied" | "unavailable";

// Past this, the fix is a cell-tower guess; ask for the pin to be placed by hand.
const ROUGH_ACCURACY_M = 100;

type Props = {
  photo: ReportPhoto;
  place: PickedPlace | null;
  onChange: (place: PickedPlace) => void;
  onBack: () => void;
  onRetake: () => void;
  onNext: () => void;
};

export function LocationStep({ photo, place, onChange, onBack, onRetake, onNext }: Props) {
  // The step asks for the location as soon as it opens, unless we already have one.
  const [gps, setGps] = useState<GpsState>(() =>
    place ? "idle" : "geolocation" in navigator ? "locating" : "unavailable",
  );
  const [focus, setFocus] = useState(0);
  const centre = useRef<LatLng | null>(null);
  const wards = useWards();
  const ward = place ? wardAt(place, wards) : null;

  // Only the async callbacks set state, so this is safe to start from an effect.
  const requestPosition = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onChange({ lat: coords.latitude, lng: coords.longitude, accuracy: Math.round(coords.accuracy), source: "gps" });
        setFocus((n) => n + 1);
        setGps("ok");
      },
      (err) => setGps(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  }, [onChange]);

  function locate() {
    if (!("geolocation" in navigator)) return setGps("unavailable");
    setGps("locating");
    requestPosition();
  }

  useEffect(() => {
    if (gps === "locating") requestPosition();
    // Runs once on open; later requests come from the locate button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickByHand = useCallback(
    (point: LatLng) => onChange({ lat: point.lat, lng: point.lng, accuracy: null, source: "manual" }),
    [onChange],
  );
  const onCentreChange = useCallback((point: LatLng) => {
    centre.current = point;
  }, []);

  const rough = place?.source === "gps" && (place.accuracy ?? 0) > ROUGH_ACCURACY_M;

  return (
    <section aria-labelledby="location-heading">
      <h1 id="location-heading" className="font-serif text-[1.75rem] font-bold leading-tight text-ink">
        Where is it?
      </h1>
      <p className="mt-1.5 text-ink-soft">
        {place?.source === "gps"
          ? "We used your phone's location. Drag the pin if it's slightly off."
          : "Tap the map where the problem is, then drag the pin to fine-tune it."}
      </p>

      {gps === "denied" && (
        <div className="mt-4">
          <Alert tone="info">Location access is off, so place the pin by hand. You can allow it in your browser settings.</Alert>
        </div>
      )}
      {gps === "unavailable" && (
        <div className="mt-4">
          <Alert tone="info">We couldn&apos;t get your location. Place the pin by hand instead.</Alert>
        </div>
      )}
      {rough && (
        <div className="mt-4">
          <Alert tone="info">
            Your location is approximate (± {formatDistance(place.accuracy ?? 0)}). Drag the pin to the exact spot.
          </Alert>
        </div>
      )}

      <div className="relative isolate mt-4 h-[50vh] min-h-72 overflow-hidden rounded-card border border-line md:h-105">
        <LocationPickerMap value={place} focus={focus} onPick={pickByHand} onCentreChange={onCentreChange} />
        <button
          type="button"
          onClick={locate}
          disabled={gps === "locating"}
          aria-label="Use my location"
          title="Use my location"
          className="absolute bottom-3 right-3 z-1000 grid size-10 place-items-center rounded-full border border-line bg-white text-pine shadow-card transition-colors hover:bg-mist disabled:opacity-60"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className={`size-5 ${gps === "locating" ? "animate-pulse" : ""}`}
            aria-hidden
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
          </svg>
        </button>
        {!place && gps !== "locating" && (
          <p className="pointer-events-none absolute inset-x-0 top-3 z-1000 mx-auto w-fit rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-ink shadow-card">
            Tap the map to drop the pin
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => centre.current && pickByHand(centre.current)}
        className="mt-2 text-xs font-bold text-brand hover:underline"
      >
        Put the pin at the centre of the map
      </button>

      <div className="mt-4 rounded-card border border-line bg-white px-4 py-3.5">
        {place ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-sm text-ink">{formatCoords(place)}</p>
              <p className="mt-1 text-xs text-ink-faint">
                {place.source === "gps" && place.accuracy
                  ? `± ${formatDistance(place.accuracy)} · from GPS`
                  : "Placed on the map by hand"}
              </p>
            </div>
            {ward ? (
              <span className="rounded-full bg-mint/12 px-2.5 py-1 text-xs font-bold text-brand">
                Ward {ward.number} · {ward.name}
              </span>
            ) : (
              wards.length > 0 && (
                <span className="rounded-full bg-amber/12 px-2.5 py-1 text-xs font-bold text-[#9a5c12]">
                  Outside the pilot wards
                </span>
              )
            )}
          </div>
        ) : (
          <p className="text-sm text-ink-faint">{gps === "locating" ? "Finding your location…" : "No location yet."}</p>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-card bg-mist px-3 py-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL */}
        <img src={photo.url} alt="" className="size-12 rounded-md object-cover" />
        <p className="flex-1 text-sm text-ink">
          Photo ready <span className="font-mono text-xs text-ink-faint">· {Math.round(photo.file.size / 1024)} KB</span>
        </p>
        <button type="button" onClick={onRetake} className="text-sm font-bold text-brand hover:underline">
          Retake
        </button>
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button className="flex-1" onClick={onNext} disabled={!place}>
          Continue
        </Button>
      </div>
    </section>
  );
}
