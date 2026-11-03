"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

// Motion uses its own versions of these event props, so the plain DOM ones are left out.
type Props = Omit<React.ComponentProps<"a">, "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "style" | "ref"> & {
  /** How strongly the button follows the cursor (0 to 1). */
  strength?: number;
  /** How far (px) outside the button the pull starts. */
  reach?: number;
};

/**
 * A link that leans toward the mouse when the cursor comes near it.
 * Mouse and trackpad only; touch screens and "reduce motion" get a normal link.
 */
export function MagneticLink({ strength = 0.35, reach = 70, children, ...props }: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 180, damping: 16, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 180, damping: 16, mass: 0.4 });

  useEffect(() => {
    const el = ref.current;
    if (!el || reduceMotion || !window.matchMedia("(pointer: fine)").matches) return;

    let frame = 0;
    function onMove(e: PointerEvent) {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!el) return;
        // Measure without the current pull so the target doesn't chase itself.
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2 - x.get();
        const cy = rect.top + rect.height / 2 - y.get();
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const near = Math.abs(dx) < rect.width / 2 + reach && Math.abs(dy) < rect.height / 2 + reach;
        x.set(near ? dx * strength : 0);
        y.set(near ? dy * strength : 0);
      });
    }
    function reset() {
      x.set(0);
      y.set(0);
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", reset);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", reset);
    };
  }, [reduceMotion, strength, reach, x, y]);

  return (
    <motion.a ref={ref} style={{ x: springX, y: springY }} {...props}>
      {children}
    </motion.a>
  );
}
