import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "Create an account" };

export default function RegisterPage() {
  return (
    <AuthLayout
      eyebrow="Join the pilot"
      title="One account for every street in the zone."
      intro="It takes a name, an email and a password. Then you can report problems around Karol Bagh and help decide when they're really fixed."
      points={[
        "Follow every report from open to fixed",
        "Neighbours' reports stack with yours, never split",
        "Your name stays off the public map",
      ]}
    >
      <Suspense>
        <RegisterForm />
      </Suspense>
    </AuthLayout>
  );
}
