"use client";

import { motion, useReducedMotion } from "framer-motion";
import { EASE_LUXE } from "@/lib/motion";

/** Dark, gold-filled progress bar, e.g. "3/5 Points to 10% Shop Discount" or "3/5 In-Store Visits". */
export function ReferralProgress({
  points,
  goal,
  label,
  hint,
}: {
  points: number;
  goal: number;
  label: string;
  /** Small line under the bar explaining how a point is earned. */
  hint?: string;
}) {
  const reduce = useReducedMotion();
  const clamped = Math.max(0, Math.min(points, goal));
  const percent = (clamped / goal) * 100;
  const left = goal - clamped;

  return (
    <div>
      <div className="flex items-center gap-3">
        <p className="shrink-0 font-display text-4xl leading-none tracking-wide">
          <span className="text-gold">{clamped}</span>
          <span className="text-offwhite/40">/{goal}</span>
        </p>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-offwhite/90">{label}</p>
          <p className="text-xs text-offwhite/45">{left === 0 ? "Reward on its way!" : `${left} to go`}</p>
        </div>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={clamped}
        aria-label={label}
        className="relative mt-4 h-3.5 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-inset ring-white/10"
      >
        <motion.div
          className="absolute inset-y-0 left-0 overflow-hidden rounded-full bg-gradient-to-r from-[#a8861c] via-gold to-gold-light shadow-[0_0_18px_rgba(201,162,39,0.55)]"
          initial={{ width: "0%" }}
          animate={{ width: `${percent}%` }}
          transition={reduce ? { duration: 0 } : { duration: 1.2, ease: EASE_LUXE, delay: 0.2 }}
        >
          {percent > 0 && (
            <motion.span
              aria-hidden="true"
              className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              initial={{ x: "-120%" }}
              // With reduced motion the shimmer just stays parked off the bar.
              animate={reduce ? { x: "-120%" } : { x: "320%" }}
              transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity, repeatDelay: 2.5 }}
            />
          )}
        </motion.div>
      </div>

      {/* One notch per point */}
      <ol className="mt-2 grid text-center text-[0.65rem] text-offwhite/35" style={{ gridTemplateColumns: `repeat(${goal}, minmax(0, 1fr))` }}>
        {Array.from({ length: goal }, (_, i) => (
          <li key={i} className={i < clamped ? "font-semibold text-gold" : undefined}>
            {i + 1}
          </li>
        ))}
      </ol>
      {hint && <p className="mt-3 text-xs leading-relaxed text-offwhite/50">{hint}</p>}
    </div>
  );
}
