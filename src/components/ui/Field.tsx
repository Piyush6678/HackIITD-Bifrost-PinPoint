"use client";

import { useId, type ComponentProps, type ReactNode } from "react";

type FieldProps = {
  label: string;
  hint?: ReactNode;
  error?: string;
};

const control =
  "w-full rounded-md border bg-white px-3 text-[0.9375rem] text-ink placeholder:text-ink-faint transition-colors focus:outline-none focus:ring-2 disabled:bg-mist disabled:text-ink-faint";

function controlClasses(error?: string) {
  return `${control} ${
    error
      ? "border-brick focus:border-brick focus:ring-brick/20"
      : "border-line hover:border-[#b9c7c3] focus:border-brand focus:ring-mint/25"
  }`;
}

function Wrapper({
  id,
  label,
  hint,
  error,
  children,
}: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.8125rem] font-bold text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="text-xs text-brick">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="text-xs text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

// aria wiring shared by every control: describedby points at the hint or error line.
function a11y(id: string, { hint, error }: FieldProps) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error || hint ? `${id}-msg` : undefined,
  };
}

export function TextField({ label, hint, error, className = "", ...rest }: FieldProps & ComponentProps<"input">) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} error={error}>
      <input {...a11y(id, { label, hint, error })} className={`h-10 ${controlClasses(error)} ${className}`} {...rest} />
    </Wrapper>
  );
}

export function TextArea({ label, hint, error, className = "", ...rest }: FieldProps & ComponentProps<"textarea">) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} error={error}>
      <textarea
        rows={4}
        {...a11y(id, { label, hint, error })}
        className={`resize-y py-2.5 leading-relaxed ${controlClasses(error)} ${className}`}
        {...rest}
      />
    </Wrapper>
  );
}

export function Select({ label, hint, error, className = "", children, ...rest }: FieldProps & ComponentProps<"select">) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} error={error}>
      <div className="relative">
        <select
          {...a11y(id, { label, hint, error })}
          className={`h-10 appearance-none pr-9 ${controlClasses(error)} ${className}`}
          {...rest}
        >
          {children}
        </select>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
          aria-hidden
        >
          <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </Wrapper>
  );
}
