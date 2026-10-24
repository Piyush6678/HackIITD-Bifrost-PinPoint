"use client";

import { useEffect, useState } from "react";
import type { PublicIssue } from "@/lib/serialize";
import { ConfirmationStep } from "./ConfirmationStep";
import { DetailsStep, EMPTY_DETAILS, type ReportDetails } from "./DetailsStep";
import { LocationStep } from "./LocationStep";
import type { PickedPlace } from "./LocationPickerMap";
import { PhotoStep, type ReportPhoto } from "./PhotoStep";
import { Stepper } from "./Stepper";

type Step = 0 | 1 | 2;

export function ReportFlow() {
  const [step, setStep] = useState<Step>(0);
  const [photo, setPhoto] = useState<ReportPhoto | null>(null);
  const [place, setPlace] = useState<PickedPlace | null>(null);
  const [details, setDetails] = useState<ReportDetails>(EMPTY_DETAILS);
  const [created, setCreated] = useState<PublicIssue | null>(null);

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
  }, [step, created]);

  if (created) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6 md:py-10">
        <ConfirmationStep issue={created} />
      </div>
    );
  }

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
          <DetailsStep
            photo={photo}
            place={place}
            details={details}
            onChange={setDetails}
            onBack={() => setStep(1)}
            onCreated={setCreated}
          />
        )}
      </div>
    </div>
  );
}
