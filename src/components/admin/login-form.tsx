"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    setError(null);
    setPending(true);

    const { error } = await createClient().auth.signInWithPassword({ email, password });

    if (error) {
      setPending(false);
      setError(
        error.message === "Invalid login credentials"
          ? "Incorrect email or password."
          : "We couldn't sign you in. Please try again.",
      );
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-charcoal py-3.5 pl-11 pr-4 text-offwhite placeholder:text-offwhite/30 transition-colors focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/20";

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <div>
        <label htmlFor="email" className="text-sm font-medium text-offwhite/80">
          Email
        </label>
        <div className="relative mt-2">
          <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-offwhite/35" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-medium text-offwhite/80">
          Password
        </label>
        <div className="relative mt-2">
          <Lock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-offwhite/35" />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className={`${inputClass} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-offwhite/40 transition-colors hover:text-gold"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-4 font-semibold text-charcoal shadow-[0_10px_30px_-10px_rgba(201,162,39,0.6)] transition-colors hover:bg-gold-light disabled:cursor-wait disabled:opacity-70"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? "Signing in…" : "Login"}
      </button>
    </form>
  );
}
