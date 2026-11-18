"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Eye, EyeOff, Gift, Loader2, Lock, Mail, MailCheck, Phone, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "register";

const REFERRAL_CODE = /^[A-Z0-9]{4,12}$/;

function friendlyError(message: string) {
  if (message === "Invalid login credentials") return "Incorrect email or password.";
  if (/already registered|already exists/i.test(message)) return "An account with this email already exists. Try logging in.";
  if (/email not confirmed/i.test(message)) return "Please confirm your email first. Check your inbox for the link.";
  if (/password/i.test(message)) return message;
  if (/signups not allowed|signup is disabled/i.test(message)) return "Sign-ups are closed right now. Please try again later.";
  return "Something went wrong. Please try again.";
}

export function CustomerAuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRef = (searchParams.get("ref") ?? "").trim().toUpperCase();
  const referralCode = REFERRAL_CODE.test(rawRef) ? rawRef : null;

  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const supabase = createClient();

    setError(null);
    setPending(true);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setPending(false);
        setError(friendlyError(error.message));
        return;
      }
      router.replace("/account");
      router.refresh();
      return;
    }

    const firstName = String(form.get("firstName") ?? "").trim();
    const lastName = String(form.get("lastName") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();

    const phoneDigits = phone.replace(/\D/g, "");
    if (phone && (!/^\+?[\d\s()-]+$/.test(phone) || phoneDigits.length < 9 || phoneDigits.length > 15)) {
      setPending(false);
      setError("Please enter a valid phone number, or leave it blank.");
      return;
    }
    if (password.length < 8) {
      setPending(false);
      setError("Use at least 8 characters for your password.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Read by the handle_new_user() trigger to create the profile and credit the referrer.
        data: { first_name: firstName, last_name: lastName, phone, referral_code: referralCode },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/account`,
      },
    });

    setPending(false);
    if (error) {
      setError(friendlyError(error.message));
      return;
    }

    if (data.session) {
      // Email confirmation is off in Supabase: signed in straight away.
      router.replace("/account");
      router.refresh();
    } else {
      setCheckEmail(email);
    }
  }

  if (checkEmail) {
    return (
      <div className="mt-8 text-center" role="status">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-gold/10 text-gold">
          <MailCheck className="size-8" strokeWidth={1.5} />
        </div>
        <p className="mt-5 font-display text-3xl tracking-wide text-offwhite">Check your inbox</p>
        <p className="mt-2 text-sm leading-relaxed text-offwhite/60">
          We sent a confirmation link to <span className="font-semibold text-offwhite">{checkEmail}</span>. Click it to
          activate your account.
        </p>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-charcoal py-3.5 pl-11 pr-4 text-offwhite placeholder:text-offwhite/30 transition-colors focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/20";
  const labelClass = "text-sm font-medium text-offwhite/80";
  const iconClass = "pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-offwhite/35";

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      {mode === "register" && referralCode && (
        <p className="flex items-center gap-3 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">
          <Gift className="size-4 shrink-0" />
          You were invited by a friend (code {referralCode}).
        </p>
      )}

      {mode === "register" && (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className={labelClass}>
                First name
              </label>
              <div className="relative mt-2">
                <User className={iconClass} />
                <input id="firstName" name="firstName" required maxLength={40} autoComplete="given-name" placeholder="Sipho" className={inputClass} />
              </div>
            </div>
            <div>
              <label htmlFor="lastName" className={labelClass}>
                Last name
              </label>
              <div className="relative mt-2">
                <User className={iconClass} />
                <input id="lastName" name="lastName" required maxLength={40} autoComplete="family-name" placeholder="Dlamini" className={inputClass} />
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="phone" className={labelClass}>
              Phone / WhatsApp <span className="text-offwhite/40">(for booking reminders)</span>
            </label>
            <div className="relative mt-2">
              <Phone className={iconClass} />
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="071 234 5678"
                className={inputClass}
              />
            </div>
          </div>
        </>
      )}

      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <div className="relative mt-2">
          <Mail className={iconClass} />
          <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" className={inputClass} />
        </div>
      </div>

      <div>
        <label htmlFor="password" className={labelClass}>
          Password
        </label>
        <div className="relative mt-2">
          <Lock className={iconClass} />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={mode === "register" ? 8 : undefined}
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
        className="btn-luxe flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-4 font-semibold text-charcoal shadow-[0_10px_30px_-10px_rgba(201,162,39,0.6)] hover:bg-gold-light disabled:cursor-wait disabled:opacity-70"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {mode === "login" ? (pending ? "Signing in…" : "Login") : pending ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-offwhite/50">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link href="/account/register" className="font-semibold text-gold hover:text-gold-light">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/account/login" className="font-semibold text-gold hover:text-gold-light">
              Login
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
