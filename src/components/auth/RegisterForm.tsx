"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { setSessionUser, type SessionUser } from "@/hooks/useSession";
import { api, ApiError } from "@/lib/api";
import { safeNext } from "@/lib/safeNext";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { TextField } from "../ui/Field";

export function RegisterForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setFields({});

    try {
      const { user } = await api<{ user: SessionUser }>("/api/auth/register", {
        method: "POST",
        json: {
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
        },
      });
      setSessionUser(user);
      // Full navigation on purpose: pages prefetched while logged out (like /report,
      // which the proxy redirected to login) are cached client-side and would be stale.
      window.location.assign(next);
    } catch (err) {
      const e = err instanceof ApiError ? err : new ApiError(0, "Something went wrong");
      // A taken email is really a problem with the email field, so show it there.
      if (e.status === 409) setFields({ email: e.message });
      else {
        setFields(e.fields);
        setError(Object.keys(e.fields).length ? null : e.message);
      }
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <h2 className="font-serif text-2xl font-bold text-ink">Create an account</h2>

      {error && <Alert>{error}</Alert>}

      <TextField label="Your name" name="name" autoComplete="name" required autoFocus error={fields.name} />
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        error={fields.email}
      />
      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="At least 8 characters."
        error={fields.password}
      />

      <Button type="submit" loading={pending} className="mt-1 w-full">
        {pending ? "Creating account" : "Create account"}
      </Button>

      <p className="text-center text-xs leading-relaxed text-ink-faint">
        Your name is never shown on the public map. Reports show the problem, not the person.
      </p>

      <p className="border-t border-line pt-4 text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link
          href={next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`}
          className="font-bold text-brand hover:underline"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}
