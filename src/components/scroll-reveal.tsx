"use client";

import { motion, type Variants } from "framer-motion";
import { EASE_LUXE, REVEAL, STAGGER } from "@/lib/motion";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Seconds to wait before animating. */
  delay?: number;
  /** How far (px) the content rises as it fades in. */
  y?: number;
  duration?: number;
};

const VIEWPORT = { once: true, margin: "0px 0px -80px 0px" } as const;

/** Fades and lifts its content into view the first time it scrolls on screen. */
export function ScrollReveal({ children, className, delay = 0, y = REVEAL.y, duration = REVEAL.duration }: Props) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration, delay, ease: EASE_LUXE }}
    >
      {children}
    </motion.div>
  );
}

const group: Variants = {
  hidden: {},
  show: (delay: number = 0) => ({ transition: { staggerChildren: STAGGER, delayChildren: delay } }),
};

const item: Variants = {
  hidden: { opacity: 0, y: REVEAL.y },
  show: { opacity: 1, y: 0, transition: { duration: REVEAL.duration, ease: EASE_LUXE } },
};

/**
 * Reveals its <StaggerItem> children one after another (0.08s apart)
 * when the group scrolls into view. The group itself doesn't move.
 */
export function Stagger({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div className={className} variants={group} custom={delay} initial="hidden" whileInView="show" viewport={VIEWPORT}>
      {children}
    </motion.div>
  );
}

/** One child of a <Stagger> group. */
export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  );
}
