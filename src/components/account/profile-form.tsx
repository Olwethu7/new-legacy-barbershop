"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { updateProfile } from "@/lib/actions/account";

export function ProfileForm({
  email,
  firstName,
  lastName,
  phone,
  marketingOptIn,
}: {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  marketingOptIn: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus(null);
    startTransition(async () => {
      const result = await updateProfile({
        firstName: String(form.get("firstName") ?? ""),
        lastName: String(form.get("lastName") ?? ""),
        phone: String(form.get("phone") ?? ""),
        marketingOptIn: form.get("marketingOptIn") === "on",
      });
      setStatus(result.ok ? { ok: true, message: "Saved." } : { ok: false, message: result.error });
    });
  }

  const input =
    "mt-1.5 w-full rounded-xl border border-charcoal/15 bg-offwhite/60 px-4 py-3 text-charcoal placeholder:text-charcoal/35 transition-colors focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20";
  const label = "text-xs font-semibold uppercase tracking-[0.15em] text-charcoal/55";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pf-first" className={label}>First name</label>
          <input id="pf-first" name="firstName" defaultValue={firstName} required maxLength={40} autoComplete="given-name" className={input} />
        </div>
        <div>
          <label htmlFor="pf-last" className={label}>Last name</label>
          <input id="pf-last" name="lastName" defaultValue={lastName} maxLength={40} autoComplete="family-name" className={input} />
        </div>
      </div>
      <div>
        <label htmlFor="pf-email" className={label}>Email</label>
        <input id="pf-email" value={email} readOnly disabled className={`${input} cursor-not-allowed opacity-60`} />
      </div>
      <div>
        <label htmlFor="pf-phone" className={label}>Phone / WhatsApp</label>
        <input id="pf-phone" name="phone" type="tel" inputMode="tel" defaultValue={phone} maxLength={20} autoComplete="tel" placeholder="071 234 5678" className={input} />
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-charcoal/10 bg-offwhite/50 p-4 text-sm text-charcoal/75">
        <input type="checkbox" name="marketingOptIn" defaultChecked={marketingOptIn} className="mt-0.5 size-4 accent-[#c9a227]" />
        Send me reminders, specials and announcements by SMS, email or WhatsApp.
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="btn-luxe inline-flex items-center gap-2 rounded-full bg-charcoal px-7 py-3 text-sm font-semibold text-offwhite hover:bg-charcoal-soft disabled:opacity-70"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {pending ? "Saving…" : "Save details"}
        </button>
        {status && (
          <p role="status" className={`flex items-center gap-2 text-sm ${status.ok ? "text-emerald-700" : "text-red-600"}`}>
            {status.ok ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
            {status.message}
          </p>
        )}
      </div>
    </form>
  );
}
