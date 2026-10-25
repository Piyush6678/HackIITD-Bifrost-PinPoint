"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import type { Category } from "@/lib/constants";
import type { PhotoTags } from "@/lib/gemini";
import { formatCoords } from "@/lib/format";
import type { PublicIssue } from "@/lib/serialize";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { TextArea, TextField } from "../ui/Field";
import { CategoryPicker } from "./CategoryPicker";
import type { PickedPlace } from "./LocationPickerMap";
import { NearbyIssueCard } from "./NearbyIssueCard";
import { NearbyIssues } from "./NearbyIssues";
import type { ReportPhoto } from "./PhotoStep";
import { SeverityPicker } from "./SeverityPicker";

export type ReportDetails = {
  title: string;
  category: Category | null;
  severity: number;
  description: string;
};

export const EMPTY_DETAILS: ReportDetails = { title: "", category: null, severity: 3, description: "" };

type Props = {
  photo: ReportPhoto;
  place: PickedPlace;
  details: ReportDetails;
  onChange: (details: ReportDetails) => void;
  // Gemini's reading of the photo, if it gave one.
  suggestion: PhotoTags | null;
  onBack: () => void;
  onCreated: (issue: PublicIssue, reopenedAfterDays: number | null) => void;
};

export function DetailsStep({ photo, place, details, onChange, suggestion, onBack, onCreated }: Props) {
  const router = useRouter();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<PublicIssue | null>(null);
  const [pending, setPending] = useState(false);

  function update(patch: Partial<ReportDetails>) {
    onChange({ ...details, ...patch });
    setFields((f) => {
      const next = { ...f };
      for (const key of Object.keys(patch)) delete next[key];
      return next;
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const problems: Record<string, string> = {};
    if (details.title.trim().length < 3) problems.title = "Give it a short title";
    if (!details.category) problems.category = "Pick the closest category";
    if (Object.keys(problems).length) return setFields(problems);

    const body = new FormData();
    body.set("photo", photo.file, photo.file.name);
    body.set("title", details.title.trim());
    body.set("category", details.category!);
    body.set("severity", String(details.severity));
    body.set("lat", String(place.lat));
    body.set("lng", String(place.lng));
    if (details.description.trim()) body.set("description", details.description.trim());
    // Stored next to what the resident chose, to see how often people correct the AI.
    if (suggestion?.looksLikeCivicIssue) {
      const { category, severity, title } = suggestion;
      body.set("aiSuggestion", JSON.stringify({ category, severity, title }));
    }

    setPending(true);
    setError(null);
    setFields({});
    setDuplicate(null);

    try {
      const result = await api<{ issue: PublicIssue; reopened?: boolean; daysSinceFix?: number }>("/api/issues", {
        method: "POST",
        body,
      });
      onCreated(result.issue, result.reopened ? (result.daysSinceFix ?? null) : null);
    } catch (err) {
      const e = err instanceof ApiError ? err : new ApiError(0, "Something went wrong");
      const existing = (e.data as { duplicateOf?: PublicIssue } | undefined)?.duplicateOf;
      if (e.status === 409 && existing) {
        setDuplicate(existing);
      } else {
        setError(Object.keys(e.fields).length ? null : e.message);
        setFields(e.fields);
      }
      setPending(false);
    }
  }

  return (
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

      <div className="mt-5">
        <NearbyIssues place={place} category={details.category} />
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-5 flex flex-col gap-5">
        {error && <Alert>{error}</Alert>}

        {suggestion &&
          (suggestion.looksLikeCivicIssue ? (
            <p className="rounded-md border border-amber/30 bg-amber/8 px-3.5 py-2.5 text-sm text-ink">
              <span className="font-bold text-amber">Suggested from your photo.</span> Check the title, category and
              severity, and change anything that&apos;s wrong.
            </p>
          ) : (
            <Alert tone="info">
              This photo doesn&apos;t clearly show a civic problem. If it does, fill in the details below; otherwise go
              back and retake it.
            </Alert>
          ))}

        {duplicate && (
          <div className="flex flex-col gap-3">
            <Alert tone="info">This looks like it&apos;s already been reported at this spot.</Alert>
            <NearbyIssueCard
              issue={duplicate}
              label="Add your voice instead"
              onVoted={(issue) => router.push(`/issues/${issue.id}`)}
            />
          </div>
        )}

        <TextField
          label="Title"
          name="title"
          value={details.title}
          onChange={(e) => update({ title: e.target.value })}
          maxLength={120}
          placeholder="e.g. Deep pothole near the metro gate"
          error={fields.title}
          autoComplete="off"
        />

        <CategoryPicker value={details.category} onChange={(category) => update({ category })} error={fields.category} />

        <SeverityPicker value={details.severity} onChange={(severity) => update({ severity })} error={fields.severity} />

        <TextArea
          label="Details (optional)"
          name="description"
          value={details.description}
          onChange={(e) => update({ description: e.target.value })}
          maxLength={1000}
          placeholder="Anything that helps the ward officer find or understand it"
          error={fields.description}
        />

        {(fields.lat || fields.lng || fields.photo) && (
          <Alert>{fields.photo ?? fields.lat ?? fields.lng}</Alert>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onBack} disabled={pending}>
            Back
          </Button>
          <Button type="submit" className="flex-1" loading={pending} disabled={duplicate !== null}>
            Submit report
          </Button>
        </div>
      </form>
    </section>
  );
}
