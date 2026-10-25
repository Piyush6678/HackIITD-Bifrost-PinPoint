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

export function LoginForm() {
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
      const { user } = await api<{ user: SessionUser }>("/api/auth/login", {
        method: "POST",
        json: { email: form.get("email"), password: form.get("password") },
      });
      setSessionUser(user);
      // Full navigation on purpose: pages prefetched while logged out (like /report,
      // which the proxy redirected to login) are cached client-side and would be stale.
      window.location.assign(next);
    } catch (err) {
      const e = err instanceof ApiError ? err : new ApiError(0, "Something went wrong");
      setError(Object.keys(e.fields).length ? null : e.message);
      setFields(e.fields);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <h2 className="font-serif text-2xl font-bold text-ink">Log in</h2>
        {next !== "/" && (
          <p className="mt-1 text-sm text-ink-soft">Log in to continue where you left off.</p>
        )}
      </div>

      {error && <Alert>{error}</Alert>}

      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        autoFocus
        error={fields.email}
      />
      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={fields.password}
      />

      <Button type="submit" loading={pending} className="mt-1 w-full">
        {pending ? "Logging in" : "Log in"}
      </Button>

      <p className="text-center text-sm text-ink-soft">
        New here?{" "}
        <Link
          href={next === "/" ? "/register" : `/register?next=${encodeURIComponent(next)}`}
          className="font-bold text-brand hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
