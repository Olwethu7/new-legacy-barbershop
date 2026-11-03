"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** How far (px) the content drifts down while its section scrolls out of view. Higher = slower-moving. */
  distance?: number;
};

/**
 * Makes its content scroll a little slower than the page, for a sense of depth.
 * Only moves with `transform`, so it never causes layout shift.
 */
export function Parallax({ children, className, distance = 120 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  // 0 when the section's top hits the top of the screen, 1 once it has scrolled fully out.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : distance]);

  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}
