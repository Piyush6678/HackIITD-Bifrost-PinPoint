"use client";

import { useEffect, useState } from "react";
import { formatCoords } from "@/lib/format";
import { Button } from "../ui/Button";
import { LocationStep } from "./LocationStep";
import type { PickedPlace } from "./LocationPickerMap";
import { PhotoStep, type ReportPhoto } from "./PhotoStep";
import { Stepper } from "./Stepper";

type Step = 0 | 1 | 2;

export function ReportFlow() {
  const [step, setStep] = useState<Step>(0);
  const [photo, setPhoto] = useState<ReportPhoto | null>(null);
  const [place, setPlace] = useState<PickedPlace | null>(null);

  // Blob URLs hold the image in memory until revoked.
  useEffect(
    () => () => {
      if (photo) URL.revokeObjectURL(photo.url);
    },
    [photo],
  );

  // Each step starts at the top, which matters on phones.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:py-10">
      <Stepper current={step} />

      <div className="mt-7">
        {step === 0 && <PhotoStep photo={photo} onChange={setPhoto} onNext={() => setStep(1)} />}

        {step === 1 && photo && (
          <LocationStep
            photo={photo}
            place={place}
            onChange={setPlace}
            onBack={() => setStep(0)}
            onRetake={() => setStep(0)}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && photo && place && (
          <section aria-labelledby="details-heading">
            <h1 id="details-heading" className="font-serif text-[1.75rem] font-bold leading-tight text-ink">
              What&apos;s the problem?
            </h1>
            <div className="mt-5 flex items-center gap-3 rounded-card border border-line bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL */}
              <img src={photo.url} alt="" className="size-16 rounded-md object-cover" />
              <div>
                <p className="text-sm font-bold text-ink">Photo and location ready</p>
                <p className="mt-0.5 font-mono text-xs text-ink-faint">{formatCoords(place)}</p>
              </div>
            </div>
            <div className="mt-6">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
