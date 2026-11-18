import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFormSkeleton, AuthShell } from "@/components/account/auth-shell";
import { CustomerAuthForm } from "@/components/account/customer-auth-form";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Join New Legacy for order history, exclusive promo codes and referral rewards.",
};

export default function CustomerRegisterPage() {
  return (
    <AuthShell
      eyebrow="Join the Legacy"
      title="Create an account"
      description="Track your orders, unlock promo codes and earn rewards when friends join."
    >
      {/* The form reads ?ref= (referral code) from the URL, which needs a Suspense boundary. */}
      <Suspense fallback={<AuthFormSkeleton />}>
        <CustomerAuthForm mode="register" />
      </Suspense>
    </AuthShell>
  );
}
