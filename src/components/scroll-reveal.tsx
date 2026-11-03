"use client";

import { motion } from "framer-motion";
import { EASE_LUXE } from "@/lib/motion";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Seconds to wait before animating (use for staggering siblings). */
  delay?: number;
  /** How far (px) the content rises as it fades in. */
  y?: number;
  duration?: number;
};

/** Fades and lifts its content into view the first time it scrolls on screen. */
export function ScrollReveal({ children, className, delay = 0, y = 32, duration = 0.9 }: Props) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -80px 0px" }}
      transition={{ duration, delay, ease: EASE_LUXE }}
    >
      {children}
    </motion.div>
  );
}
