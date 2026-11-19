"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, BadgeCheck, Gift, Loader2, ScanLine, Scissors } from "lucide-react";
import { toast } from "sonner";
import { confirmReferralCode, redeemServiceDiscount } from "@/lib/actions/referrals";
import { goldToast } from "@/lib/gold-toast";
import { EASE_LUXE } from "@/lib/motion";
import { REFERRAL_POINTS_GOAL, REFERRAL_SERVICE_PERCENT, REFERRAL_SHOP_PERCENT } from "@/lib/referrals";

type Outcome =
  | { ok: true; code: string; referrer: string; friend: string; points: number; rewarded: boolean }
  | { ok: false; error: string };

/** Admin -> Referrals: type the customer's Referral Proof Code and confirm it. */
export function ReferralConfirm() {
  const [code, setCode] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim()) return;
    startTransition(async () => {
      const result = await confirmReferralCode(code);
      setOutcome(result);
      if (result.ok) {
        setCode("");
        goldToast(
          "Referral confirmed",
          result.rewarded
            ? `${result.referrer} just unlocked a reward!`
            : `${result.referrer} now has ${result.points}/${REFERRAL_POINTS_GOAL} points.`,
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <section className="relative overflow-hidden rounded-2xl bg-charcoal p-5 text-offwhite shadow-xl sm:p-8">
      <div aria-hidden="true" className="absolute -right-20 -top-20 size-64 rounded-full bg-gold/15 blur-3xl" />
      <div className="relative">
        <h2 className="flex items-center gap-2 font-display text-3xl tracking-wide sm:text-4xl">
          <ScanLine className="size-6 text-gold" /> Confirm a Referral
        </h2>
        <p className="mt-2 max-w-xl text-sm text-offwhite/60">
          A referred customer shows their Referral Proof Code from their account page. Codes are valid for 7 days.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="proof-code" className="sr-only">
            Referral Proof Code
          </label>
          <input
            id="proof-code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              if (outcome) setOutcome(null);
            }}
            placeholder="REF-8X2BK7"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={12}
            className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 font-mono text-lg tracking-[0.2em] text-offwhite placeholder:text-offwhite/25 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/25"
          />
          <button
            type="submit"
            disabled={pending || !code.trim()}
            className="btn-luxe inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3.5 font-semibold text-charcoal hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-5 animate-spin" /> : <BadgeCheck className="size-5" />}
            {pending ? "Checking…" : "Confirm Referral"}
          </button>
        </form>

        <AnimatePresence mode="wait">
          {outcome && (
            <motion.div
              key={outcome.ok ? outcome.code : outcome.error}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.35, ease: EASE_LUXE }}
              role="status"
              className={`mt-5 rounded-xl border p-4 text-sm ${
                outcome.ok ? "border-gold/40 bg-gold/10 text-offwhite" : "border-red-400/40 bg-red-500/10 text-red-200"
              }`}
            >
              {outcome.ok ? (
                <>
                  <p className="flex items-center gap-2 font-semibold text-gold">
                    <BadgeCheck className="size-4 shrink-0" /> {outcome.code} confirmed
                  </p>
                  <p className="mt-1 text-offwhite/75">
                    {outcome.friend} was referred by <strong className="text-offwhite">{outcome.referrer}</strong>.
                  </p>
                  {outcome.rewarded ? (
                    <p className="mt-2 flex items-start gap-2 text-offwhite/85">
                      <Gift className="mt-0.5 size-4 shrink-0 text-gold" />
                      Reward unlocked: a {REFERRAL_SHOP_PERCENT}% shop code was sent to their account, and their next
                      haircut is {REFERRAL_SERVICE_PERCENT}% off.
                    </p>
                  ) : (
                    <p className="mt-2 text-offwhite/60">
                      {outcome.referrer} now has {outcome.points}/{REFERRAL_POINTS_GOAL} points.
                    </p>
                  )}
                </>
              ) : (
                <p className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" /> {outcome.error}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

/** "Mark as used" for a customer's 20%-off haircut reward. */
export function RedeemServiceButton({ profileId, name }: { profileId: string; name: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(`Mark ${name}'s ${REFERRAL_SERVICE_PERCENT}% haircut discount as used?`)) return;
    startTransition(async () => {
      const result = await redeemServiceDiscount(profileId);
      if (result.ok) goldToast("Haircut reward used", `${name}'s ${REFERRAL_SERVICE_PERCENT}% discount has been applied.`);
      else toast.error(result.error);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gold/60 px-3 py-1.5 text-xs font-semibold text-charcoal transition-colors hover:bg-gold disabled:opacity-60"
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Scissors className="size-3.5" />}
      Mark used
    </button>
  );
}
