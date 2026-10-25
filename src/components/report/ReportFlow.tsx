"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { PhotoTags } from "@/lib/gemini";
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
  const [created, setCreated] = useState<{ issue: PublicIssue; reopenedAfterDays: number | null } | null>(null);
  // What Gemini made of the current photo, keyed by its URL so a retake drops it.
  const [ai, setAi] = useState<{ url: string; tags: PhotoTags | null; blocked: string | null } | null>(null);

  // Blob URLs hold the image in memory until revoked.
  useEffect(
    () => () => {
      if (photo) URL.revokeObjectURL(photo.url);
    },
    [photo],
  );

  // Ask for suggestions while the resident places the pin; it's ready by the details step.
  useEffect(() => {
    if (!photo) return;
    const controller = new AbortController();
    const body = new FormData();
    body.set("photo", photo.file, photo.file.name);
    api<{ suggestion: PhotoTags | null; blocked: string | null }>("/api/ai/tag", {
      method: "POST",
      body,
      signal: controller.signal,
    })
      .then(({ suggestion, blocked }) => {
        setAi({ url: photo.url, tags: suggestion, blocked });
        if (!suggestion) return;
        // Only fill what the resident hasn't touched.
        setDetails((d) => ({
          ...d,
          title: d.title || (suggestion.looksLikeCivicIssue ? suggestion.title : ""),
          category: d.category ?? (suggestion.looksLikeCivicIssue ? suggestion.category : null),
          severity: d.severity === EMPTY_DETAILS.severity && suggestion.looksLikeCivicIssue ? suggestion.severity : d.severity,
        }));
      })
      // Suggestions are optional; the form works the same without them.
      .catch(() => {});
    return () => controller.abort();
  }, [photo]);

  // Each step starts at the top, which matters on phones.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step, created]);

  if (created) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6 md:py-10">
        <ConfirmationStep issue={created.issue} reopenedAfterDays={created.reopenedAfterDays} />
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
            suggestion={ai?.url === photo.url ? ai.tags : null}
            blocked={ai?.url === photo.url ? ai.blocked : null}
            onRetake={() => setStep(0)}
            onBack={() => setStep(1)}
            onCreated={(issue, reopenedAfterDays) => setCreated({ issue, reopenedAfterDays })}
          />
        )}
      </div>
    </div>
  );
}
