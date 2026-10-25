import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <AuthLayout
      eyebrow="Why an account"
      title="Looking is free. Reporting needs a name."
      intro="Anyone can read the map. An account lets you report a problem, add your voice to one that's already open, and vote on whether a fix is real."
      points={["Report in under a minute", "Add your voice instead of duplicating", "Confirm fixes near you"]}
    >
      {/* The form reads ?next= from the URL, which needs a Suspense boundary. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
