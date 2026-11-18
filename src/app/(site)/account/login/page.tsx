import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFormSkeleton, AuthShell } from "@/components/account/auth-shell";
import { CustomerAuthForm } from "@/components/account/customer-auth-form";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to see your orders, rewards and referral link.",
  robots: { index: false },
};

export default function CustomerLoginPage() {
  return (
    <AuthShell eyebrow="My Account" title="Welcome back" description="Sign in to see your orders, rewards and referral link.">
      <Suspense fallback={<AuthFormSkeleton />}>
        <CustomerAuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}
