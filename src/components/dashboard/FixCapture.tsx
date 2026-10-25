"use client";

import { useEffect, useRef, useState } from "react";
import type { QueueIssue } from "@/hooks/useQueue";
import { api, ApiError } from "@/lib/api";
import { compressPhoto, PhotoError } from "@/lib/compressPhoto";
import { FIX_MAX_ACCURACY_M, FIX_RADIUS_M } from "@/lib/constants";
import { formatDistance } from "@/lib/format";
import { distanceInMetres } from "@/lib/geo";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { TextArea } from "../ui/Field";
import { Spinner } from "../ui/Skeleton";

type Position = { lat: number; lng: number; accuracy: number };
type Shot = { file: File; url: string; takenAt: number };

type Props = {
  issue: QueueIssue;
  onCancel: () => void;
  onDone: () => void;
};

// The after-photo has to be taken here and now, at the issue. The camera is opened in
// the page (no gallery), and the phone's position is sent with it for the server to check.
export function FixCapture({ issue, onCancel, onDone }: Props) {
  const position = usePosition();
  const [shot, setShot] = useState<Shot | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => () => {
    if (shot) URL.revokeObjectURL(shot.url);
  }, [shot]);

  const here = position.value;
  const distance = here ? Math.round(distanceInMetres(here, issue.location)) : null;
  const closeEnough = distance !== null && distance <= FIX_RADIUS_M;
  const preciseEnough = here !== null && here.accuracy <= FIX_MAX_ACCURACY_M;

  async function submit() {
    if (!shot || !here) return;
    const body = new FormData();
    body.set("status", "pending_verification");
    body.set("lat", String(here.lat));
    body.set("lng", String(here.lng));
    body.set("accuracy", String(Math.round(here.accuracy)));
    body.set("takenAt", String(shot.takenAt));
    if (note.trim()) body.set("note", note.trim());
    body.set("photo", shot.file, shot.file.name);

    setPending(true);
    setError(null);
    try {
      await api(`/api/issues/${issue.id}/status`, { method: "PATCH", body });
      onDone();
    } catch (err) {
      const e = err instanceof ApiError ? err : new ApiError(0, "Something went wrong");
      setError(Object.values(e.fields)[0] ?? e.message);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="font-serif text-lg font-bold text-ink">Mark as fixed</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Stand where the problem was and take a photo of the finished work. An AI first checks it matches the
          reported problem, then residents nearby compare it with the original and confirm or reject the fix.
        </p>
      </div>

      <LocationCheck state={position} distance={distance} closeEnough={closeEnough} preciseEnough={preciseEnough} />

      {shot ? (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL */}
          <img
            src={shot.url}
            alt="Your after-photo"
            className="aspect-4/3 w-full rounded-card border border-line bg-mist object-cover"
          />
          <div className="mt-2 flex items-center justify-between">
            <p className="font-mono text-xs text-ink-faint">{Math.round(shot.file.size / 1024)} KB · just now</p>
            <Button variant="ghost" size="sm" onClick={() => setShot(null)} disabled={pending}>
              Retake
            </Button>
          </div>
        </div>
      ) : (
        <LiveCamera onShot={setShot} />
      )}

      <TextArea
        label="What was done (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="e.g. Pothole filled with hot mix and rolled"
      />

      {error && <Alert>{error}</Alert>}
      {pending && <p className="text-xs text-ink-faint">Checking the photo against the report…</p>}

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button
          variant="accent"
          className="flex-1"
          loading={pending}
          disabled={!shot || !closeEnough || !preciseEnough}
          onClick={submit}
        >
          Send to residents
        </Button>
      </div>
    </div>
  );
}

type PositionState = { value: Position | null; error: string | null };

function usePosition(): PositionState {
  // Only ever rendered after a tap in the drawer, so navigator exists.
  const supported = "geolocation" in navigator;
  const [state, setState] = useState<PositionState>({
    value: null,
    error: supported ? null : "This browser can't share its location.",
  });

  useEffect(() => {
    if (!supported) return;
    // Watch rather than read once: the fix tightens over the first few seconds outdoors.
    const id = navigator.geolocation.watchPosition(
      ({ coords }) =>
        setState({ value: { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy }, error: null }),
      (err) =>
        setState((s) => ({
          value: s.value,
          error:
            err.code === err.PERMISSION_DENIED
              ? "Location is blocked. Allow it for this site so PinPoint can check you're at the issue."
              : "Couldn't get your location yet. Step into the open if you're indoors.",
        })),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [supported]);

  return state;
}

function LocationCheck({
  state,
  distance,
  closeEnough,
  preciseEnough,
}: {
  state: PositionState;
  distance: number | null;
  closeEnough: boolean;
  preciseEnough: boolean;
}) {
  if (!state.value) {
    return state.error ? (
      <Alert>{state.error}</Alert>
    ) : (
      <p role="status" className="flex items-center gap-2 rounded-md bg-mist px-3.5 py-3 text-sm text-ink-soft">
        <Spinner className="size-4 text-brand" />
        Finding your location
      </p>
    );
  }

  const ok = closeEnough && preciseEnough;
  return (
    <div
      role="status"
      className={`rounded-md border px-3.5 py-3 text-sm ${
        ok ? "border-mint/40 bg-mint/8 text-pine" : "border-brick/25 bg-brick/8 text-brick"
      }`}
    >
      <p className="font-bold">
        {ok
          ? `You're at the issue (${formatDistance(distance!)} away)`
          : !preciseEnough
            ? "Your GPS is too rough to check"
            : `You're ${formatDistance(distance!)} from the issue`}
      </p>
      <p className="mt-0.5 font-mono text-xs opacity-80">
        GPS ±{Math.round(state.value.accuracy)} m ·{" "}
        {ok
          ? "ready"
          : !preciseEnough
            ? `needs ±${FIX_MAX_ACCURACY_M} m or better`
            : `must be within ${FIX_RADIUS_M} m`}
      </p>
    </div>
  );
}

const MAX_SIDE = 1600;

function LiveCamera({ onShot }: { onShot: (shot: Shot) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const fallback = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [state, setState] = useState<"idle" | "starting" | "live" | "unavailable">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (video.current && stream) video.current.srcObject = stream;
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [stream]);

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("unavailable");
      return;
    }
    setState("starting");
    setError(null);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } },
        audio: false,
      });
      setStream(media);
      setState("live");
    } catch {
      setState("unavailable");
    }
  }

  function capture() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const scale = Math.min(1, MAX_SIDE / Math.max(v.videoWidth, v.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    canvas.getContext("2d")!.drawImage(v, 0, 0, canvas.width, canvas.height);
    const takenAt = Date.now();
    canvas.toBlob(
      (blob) => {
        if (!blob) return setError("Couldn't capture the photo. Try again.");
        const file = new File([blob], "after.jpg", { type: "image/jpeg", lastModified: takenAt });
        setStream(null);
        onShot({ file, url: URL.createObjectURL(file), takenAt });
      },
      "image/jpeg",
      0.8,
    );
  }

  // Phones without in-page camera access still open the camera app straight away.
  async function onFile(file: File | undefined) {
    if (!file) return;
    const takenAt = file.lastModified;
    try {
      const compressed = await compressPhoto(file);
      onShot({ file: compressed, url: URL.createObjectURL(compressed), takenAt });
    } catch (err) {
      setError(err instanceof PhotoError ? err.message : "Something went wrong preparing the photo.");
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-3">
          <Alert>{error}</Alert>
        </div>
      )}
      <input
        ref={fallback}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {state === "live" ? (
        <div className="overflow-hidden rounded-card border border-line bg-ink">
          <video ref={video} autoPlay playsInline muted className="aspect-4/3 w-full object-cover" />
          <div className="flex justify-center bg-ink px-4 py-3">
            <Button variant="accent" onClick={capture}>
              Take after-photo
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-card border-2 border-dashed border-line bg-white px-6 py-8 text-center">
          {state === "unavailable" ? (
            <>
              <p className="text-sm text-ink-soft">The camera couldn&apos;t be opened in the page.</p>
              <Button className="mt-4" onClick={() => fallback.current?.click()}>
                Open the camera app
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-soft">Photos from the gallery aren&apos;t accepted for fixes.</p>
              <Button className="mt-4" loading={state === "starting"} onClick={start}>
                Open camera
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
