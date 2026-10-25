"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useSession } from "@/hooks/useSession";
import { useWards } from "@/hooks/useWards";
import { api, ApiError } from "@/lib/api";
import { CATEGORY_RULES } from "@/lib/categories";
import { isOfficialEmail } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { PublicRequest } from "@/lib/officerRequests";
import { Alert } from "../ui/Alert";
import { Button, buttonClasses } from "../ui/Button";
import { Select, TextArea, TextField } from "../ui/Field";
import { Skeleton } from "../ui/Skeleton";

const DEPARTMENTS = [...new Set(Object.values(CATEGORY_RULES).map((r) => r.department))];

type Loaded = { request: PublicRequest | null };

export function OfficerAccess() {
  const session = useSession();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<Loaded>("/api/officer-requests")
      .then((data) => !cancelled && setLoaded(data))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : "Couldn't load your request."));
    return () => {
      cancelled = true;
    };
  }, []);

  async function withdraw() {
    try {
      await api("/api/officer-requests", { method: "DELETE" });
      setLoaded({ request: null });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't withdraw the request.");
    }
  }

  let body;
  if (session.status === "loading" || (!loaded && !error)) {
    body = <Skeleton className="h-64 w-full rounded-card" />;
  } else if (session.user && session.user.role !== "citizen") {
    body = (
      <div className="rounded-card border border-line bg-white p-5">
        <p className="font-bold text-ink">
          You already have {session.user.role === "admin" ? "admin" : "officer"} access
          {session.user.ward ? ` for Ward ${session.user.ward.number} · ${session.user.ward.name}` : ""}.
        </p>
        <Link href="/dashboard" className={buttonClasses({ className: "mt-4" })}>
          Open the ward dashboard
        </Link>
      </div>
    );
  } else if (error && !loaded) {
    body = <Alert>{error}</Alert>;
  } else if (loaded?.request?.status === "pending" && !applying) {
    body = <PendingCard request={loaded.request} onWithdraw={withdraw} />;
  } else if (loaded?.request && loaded.request.status !== "pending" && !applying) {
    body = <DecidedCard request={loaded.request} onApplyAgain={() => setApplying(true)} />;
  } else {
    body = (
      <RequestForm
        email={session.user?.email ?? ""}
        onSent={(request) => {
          setApplying(false);
          setLoaded({ request });
        }}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6 md:px-6 md:py-10">
      <p className="eyebrow text-ink-faint">For ward officers</p>
      <h1 className="mt-1 font-serif text-[1.75rem] font-bold leading-tight text-ink md:text-4xl">
        Request officer access
      </h1>
      <p className="mt-2 text-ink-soft">
        Officers see their ward&apos;s work queue and post the after-photo when something is fixed. A PinPoint admin
        checks who you are before your account gets access.
      </p>
      <div className="mt-6">{body}</div>
    </div>
  );
}

function PendingCard({ request, onWithdraw }: { request: PublicRequest; onWithdraw: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="rounded-card border border-line bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <p className="font-bold text-ink">Waiting for an admin</p>
        <span className="rounded-full bg-status-progress/12 px-2.5 py-0.5 text-xs font-bold text-amber">Pending</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-5 py-4">
        <Meta label="Ward">{request.ward ? `Ward ${request.ward.number} · ${request.ward.name}` : "—"}</Meta>
        <Meta label="Sent">{formatDate(request.createdAt)}</Meta>
        <Meta label="Designation">{request.designation}</Meta>
        <Meta label="Department">{request.department}</Meta>
      </dl>
      <p className="border-t border-line px-5 py-3.5 text-sm text-ink-soft">
        Once it&apos;s approved, &ldquo;Ward dashboard&rdquo; appears in your account menu. You don&apos;t need to log in
        again.
      </p>
      <div className="border-t border-line px-5 py-3.5">
        <Button
          variant="ghost"
          size="sm"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            await onWithdraw();
            setBusy(false);
          }}
        >
          Withdraw request
        </Button>
      </div>
    </div>
  );
}

// Only shown to residents. The role comes fresh from the database, so an approved request
// here means an admin has since removed that access.
function DecidedCard({ request, onApplyAgain }: { request: PublicRequest; onApplyAgain: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      {request.status === "approved" ? (
        <Alert tone="info">
          <p className="font-bold">
            Your officer access{request.ward ? ` for Ward ${request.ward.number}` : ""} has been removed
          </p>
          <p className="mt-1">If you&apos;ve moved to another ward, send a new request.</p>
        </Alert>
      ) : (
        <Alert>
          <p className="font-bold">Your last request wasn&apos;t approved</p>
          {request.reviewNote && <p className="mt-1">&ldquo;{request.reviewNote}&rdquo;</p>}
        </Alert>
      )}
      <Button variant="secondary" className="self-start" onClick={onApplyAgain}>
        Send a new request
      </Button>
    </div>
  );
}

function RequestForm({ email, onSent }: { email: string; onSent: (request: PublicRequest) => void }) {
  const wards = useWards();
  const [form, setForm] = useState({ wardNumber: "", designation: "", department: "", employeeId: "", phone: "", note: "" });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const government = isOfficialEmail(email);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setFields((f) => {
      const next = { ...f };
      delete next[key];
      return next;
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const { request } = await api<{ request: PublicRequest }>("/api/officer-requests", {
        method: "POST",
        json: { ...form, wardNumber: form.wardNumber ? Number(form.wardNumber) : 0 },
      });
      onSent(request);
    } catch (err) {
      const e = err instanceof ApiError ? err : new ApiError(0, "Something went wrong");
      setFields(e.fields);
      setError(Object.keys(e.fields).length ? null : e.message);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5 rounded-card border border-line bg-white p-5">
      {error && <Alert>{error}</Alert>}

      {!government && (
        <Alert tone="info">
          Your account uses <span className="font-bold">{email}</span>. Requests are quickest from a government address
          (@mcd.nic.in or @delhi.gov.in). Otherwise the admin will need to check your employee id another way.
        </Alert>
      )}

      <Select
        label="Your ward"
        value={form.wardNumber}
        onChange={(e) => update("wardNumber", e.target.value)}
        error={fields.wardNumber}
      >
        <option value="">Pick a ward</option>
        {wards.map((w) => (
          <option key={w.id} value={w.number}>
            Ward {w.number} · {w.name}
          </option>
        ))}
      </Select>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Designation"
          value={form.designation}
          onChange={(e) => update("designation", e.target.value)}
          placeholder="e.g. Junior Engineer"
          maxLength={80}
          error={fields.designation}
        />
        <TextField
          label="Department"
          value={form.department}
          onChange={(e) => update("department", e.target.value)}
          list="departments"
          placeholder="e.g. MCD Sanitation"
          maxLength={80}
          error={fields.department}
        />
        <datalist id="departments">
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
        <TextField
          label="Employee id (optional)"
          value={form.employeeId}
          onChange={(e) => update("employeeId", e.target.value)}
          maxLength={40}
          error={fields.employeeId}
          autoComplete="off"
        />
        <TextField
          label="Office phone (optional)"
          type="tel"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          maxLength={20}
          error={fields.phone}
        />
      </div>

      <TextArea
        label="Anything the admin should know (optional)"
        value={form.note}
        onChange={(e) => update("note", e.target.value)}
        maxLength={500}
        rows={3}
        error={fields.note}
      />

      <Button type="submit" loading={pending} className="self-start">
        Send request
      </Button>
    </form>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="eyebrow text-ink-faint">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{children}</dd>
    </div>
  );
}
