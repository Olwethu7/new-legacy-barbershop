"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock, Copy, Loader2, QrCode, RefreshCw, TimerOff } from "lucide-react";
import { toast } from "sonner";
import { generateReferralProofCode } from "@/lib/actions/referrals";
import { goldToast } from "@/lib/gold-toast";
import { EASE_LUXE } from "@/lib/motion";
import { proofCodeExpiresAt } from "@/lib/referrals";

type Claim = { code: string; createdAt: string; claimed: boolean } | null;

function timeLeft(ms: number) {
  const hours = Math.ceil(ms / 3_600_000);
  if (hours <= 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.ceil(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

/**
 * The referred friend's in-store Referral Proof Code. It's valid for 7 days;
 * after that it shows "Code Expired" and offers a new one.
 */
export function ReferralProofCode({ initial, serverNow }: { initial: Claim; serverNow: number }) {
  const [claim, setClaim] = useState<Claim>(initial);
  const [now, setNow] = useState(serverNow);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  // Re-check the expiry every minute so an open tab flips to "Code Expired" on time.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const expiresAt = claim ? proofCodeExpiresAt(claim.createdAt) : 0;
  const expired = !!claim && !claim.claimed && expiresAt <= now;
  const active = !!claim && !claim.claimed && !expired;

  function generate() {
    startTransition(async () => {
      const result = await generateReferralProofCode();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setClaim({ code: result.code, createdAt: result.createdAt, claimed: false });
      setNow(Date.now());
      goldToast("Your Referral Proof Code is ready", `Show ${result.code} at the shop within 7 days.`);
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
        Your referral has been confirmed and your friend got the credit. Thanks for choosing New Legacy!
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
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-gold/80">Referral Proof Code</p>
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
          <p className="mt-3 flex items-center gap-1.5 text-xs text-offwhite/55">
            <Clock className="size-3.5" />
            Expires in {timeLeft(expiresAt - now)} · show it to your barber
          </p>
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
