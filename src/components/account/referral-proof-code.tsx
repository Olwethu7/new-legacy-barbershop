"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock, Copy, Loader2, QrCode, RefreshCw, TimerOff } from "lucide-react";
import { toast } from "sonner";
import { generateReferralProofCode } from "@/lib/actions/referrals";
import { goldToast } from "@/lib/gold-toast";
import { EASE_LUXE } from "@/lib/motion";
type Claim = { code: string; expiresAt: string; claimed: boolean } | null;

/** 7-day countdown split into units, e.g. { d: 6, h: 23, m: 59, s: 12 }. */
function countdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(total / 86400), h: Math.floor((total % 86400) / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}

/**
 * The referred friend's In-Store Proof Code (created when they signed up). It's valid for 7 days,
 * with a live countdown; after that it shows "Code Expired" and offers a new one.
 */
export function ReferralProofCode({ initial, serverNow }: { initial: Claim; serverNow: number }) {
  const [claim, setClaim] = useState<Claim>(initial);
  const [now, setNow] = useState(serverNow);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  // Ticks every second for the countdown; flips to "Code Expired" right on time.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const expiresAt = claim ? new Date(claim.expiresAt).getTime() : 0;
  const expired = !!claim && !claim.claimed && expiresAt <= now;
  const active = !!claim && !claim.claimed && !expired;

  function generate() {
    startTransition(async () => {
      const result = await generateReferralProofCode();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setClaim({ code: result.code, expiresAt: result.expiresAt, claimed: false });
      setNow(Date.now());
      goldToast("Your In-Store Proof Code is ready", `Show ${result.code} at the shop within 7 days.`);
    });
  }

  async function copy() {
    if (!claim) return;
    try {
      await navigator.clipboard.writeText(claim.code);
      setCopied(true);
      goldToast("Code copied", claim.code);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Please write the code down instead.");
    }
  }

  if (claim?.claimed) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-gold/30 bg-gold/10 p-4 text-sm text-offwhite/80">
        <Check className="mt-0.5 size-4 shrink-0 text-gold" />
        Your in-store visit has been confirmed and your friend got the credit. Thanks for choosing New Legacy!
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {claim && active ? (
        <motion.div
          key={claim.code}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.4, ease: EASE_LUXE }}
          className="rounded-2xl border border-dashed border-gold/60 bg-black/30 p-4 sm:p-5"
        >
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-gold/80">In-Store Proof Code</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-3xl font-bold tracking-[0.18em] text-offwhite sm:text-4xl" aria-live="polite">
              {claim.code}
            </p>
            <motion.button
              type="button"
              onClick={copy}
              whileTap={{ scale: 0.94 }}
              className={`relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl px-5 py-3 text-sm font-semibold transition-colors ${
                copied ? "bg-emerald-500 text-white" : "bg-gold text-charcoal hover:bg-gold-light"
              }`}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={copied ? "done" : "copy"}
                  initial={{ y: 14, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -14, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="inline-flex items-center gap-2"
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? "Copied!" : "Copy Code"}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </div>
          <div className="mt-4">
            <p className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-offwhite/45">
              <Clock className="size-3.5" /> Expires in
            </p>
            <Countdown ms={expiresAt - now} />
            <p className="mt-2 text-xs text-offwhite/45">Show it to your barber before it runs out.</p>
          </div>
        </motion.div>
      ) : expired ? (
        <motion.div
          key="expired"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 sm:p-5"
        >
          <p className="flex items-center gap-2 font-semibold text-red-200">
            <TimerOff className="size-4" /> Code Expired
          </p>
          <p className="mt-1 font-mono text-sm tracking-widest text-offwhite/35 line-through">{claim?.code}</p>
          <GenerateButton onClick={generate} pending={pending} label="Generate New Code" />
        </motion.div>
      ) : (
        <motion.div key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <GenerateButton onClick={generate} pending={pending} label="Generate My Code" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Countdown({ ms }: { ms: number }) {
  const { d, h, m, s } = countdown(ms);
  const units = [
    { v: d, l: "days" },
    { v: h, l: "hrs" },
    { v: m, l: "min" },
    { v: s, l: "sec" },
  ];
  return (
    <div className="mt-1.5 grid max-w-xs grid-cols-4 gap-2" role="timer" aria-label={`${d} days ${h} hours ${m} minutes left`}>
      {units.map(({ v, l }) => (
        <div key={l} className="rounded-lg bg-white/[0.06] px-1 py-2 text-center ring-1 ring-inset ring-white/10">
          <span className="block font-display text-2xl leading-none tabular-nums text-gold">{String(v).padStart(2, "0")}</span>
          <span className="mt-1 block text-[0.6rem] uppercase tracking-wider text-offwhite/45">{l}</span>
        </div>
      ))}
    </div>
  );
}

function GenerateButton({ onClick, pending, label }: { onClick: () => void; pending: boolean; label: string }) {
  const Icon = label.includes("New") ? RefreshCw : QrCode;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="btn-luxe mt-3 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-charcoal hover:bg-gold-light disabled:opacity-60"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
      {pending ? "Generating…" : label}
    </button>
  );
}
