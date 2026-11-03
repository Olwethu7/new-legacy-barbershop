import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Login" };

export default function AdminLoginPage() {
  return (
    <div className="relative isolate flex min-h-svh flex-1 items-center justify-center overflow-hidden px-4 py-16">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(201,162,39,0.14),transparent_70%)]"
      />

      <div className="w-full max-w-md">
        <div className="text-center">
          <p className="font-display text-4xl tracking-wide text-offwhite">
            NEW <span className="text-gold">LEGACY</span>
          </p>
          <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-offwhite/40">Admin Panel</p>
        </div>

        <div className="mt-10 rounded-3xl border border-white/10 bg-charcoal-soft/80 p-8 shadow-2xl shadow-black/40 backdrop-blur sm:p-10">
          <h1 className="font-display text-4xl tracking-wide text-offwhite">Sign in</h1>
          <p className="mt-1 text-sm text-offwhite/50">Manage products, orders and your site.</p>
          <LoginForm />
        </div>

        <Link
          href="/"
          className="mx-auto mt-8 flex w-fit items-center gap-2 text-sm text-offwhite/40 transition-colors hover:text-gold"
        >
          <ArrowLeft className="size-4" />
          Back to website
        </Link>
      </div>
    </div>
  );
}
