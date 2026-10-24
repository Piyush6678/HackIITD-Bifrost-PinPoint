"use client";

import { useRef, useState, type DragEvent } from "react";
import { compressPhoto, PhotoError } from "@/lib/compressPhoto";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Skeleton";

export type ReportPhoto = { file: File; url: string };

type Props = {
  photo: ReportPhoto | null;
  onChange: (photo: ReportPhoto | null) => void;
  onNext: () => void;
};

export function PhotoStep({ photo, onChange, onNext }: Props) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function accept(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const compressed = await compressPhoto(file);
      onChange({ file: compressed, url: URL.createObjectURL(compressed) });
    } catch (err) {
      setError(err instanceof PhotoError ? err.message : "Something went wrong preparing the photo.");
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    accept(e.dataTransfer.files[0]);
  }

  return (
    <section aria-labelledby="photo-heading">
      <h1 id="photo-heading" className="font-serif text-[1.75rem] font-bold leading-tight text-ink">
        Take a photo of the problem
      </h1>
      <p className="mt-1.5 text-ink-soft">One clear photo is enough. It&apos;s made smaller on your phone before it&apos;s sent.</p>

      {/* Two inputs: `capture` jumps straight to the camera on phones, the other allows the gallery. */}
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          accept(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={gallery}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          accept(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {error && (
        <div className="mt-5">
          <Alert>{error}</Alert>
        </div>
      )}

      {photo ? (
        <div className="mt-5">
          {/* eslint-disable-next-line @next/next/no-img-element -- a local blob URL, nothing for next/image to optimise */}
          <img
            src={photo.url}
            alt="The photo you took of the problem"
            className="aspect-4/3 w-full rounded-card border border-line bg-mist object-cover"
          />
          <p className="mt-2 font-mono text-xs text-ink-faint">
            Ready to send · {Math.round(photo.file.size / 1024)} KB
          </p>
          <div className="mt-5 flex gap-3">
            <Button variant="secondary" onClick={() => camera.current?.click()} disabled={busy}>
              Retake
            </Button>
            <Button className="flex-1" onClick={onNext} disabled={busy}>
              Continue
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`mt-5 flex flex-col items-center rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors ${
            dragging ? "border-mint bg-mint/5" : "border-line bg-white"
          }`}
        >
          {busy ? (
            <div className="flex flex-col items-center gap-3 py-6 text-ink-soft" role="status">
              <Spinner className="size-6 text-brand" />
              Preparing your photo
            </div>
          ) : (
            <>
              <span className="grid size-14 place-items-center rounded-full bg-mist text-pine">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-7" aria-hidden>
                  <path
                    d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9Z"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="12.5" r="3.5" />
                </svg>
              </span>
              <Button className="mt-5 w-full max-w-xs" onClick={() => camera.current?.click()}>
                Take a photo
              </Button>
              <Button variant="ghost" className="mt-2" onClick={() => gallery.current?.click()}>
                Choose from gallery
              </Button>
              <p className="mt-3 hidden text-xs text-ink-faint md:block">or drop a photo here</p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
