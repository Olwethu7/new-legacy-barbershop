"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";

/** Shop photos that slowly crossfade behind the hero. Kept very faint so they read as texture. */
const SLIDES = ["/gallery/new-legacy-09.png", "/gallery/new-legacy-13.png", "/gallery/new-legacy-19.png"];
const HOLD_MS = 7000;

/**
 * Ambient hero background: faint photo crossfade (every 7s, 1.5s fade),
 * drifting gold dust and film grain. Opacity and transform only.
 * With "reduce motion" on, the first photo stays put and nothing drifts.
 */
export function HeroBackdrop() {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      // Don't advance while the tab is hidden, so it doesn't jump on return.
      if (!document.hidden) setActive((i) => (i + 1) % SLIDES.length);
    }, HOLD_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {SLIDES.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          sizes="100vw"
          className={`object-cover grayscale transition-opacity duration-[1500ms] ease-in-out ${
            i === active ? "opacity-[0.13]" : "opacity-0"
          }`}
        />
      ))}

      {/* Charcoal wash so the text side stays clean and the edges fall off into darkness */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_70%_40%,transparent_0%,rgba(17,17,17,0.75)_70%,#111111_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-r from-charcoal/80 via-charcoal/30 to-transparent" />

      {/* Gold dust (taller than the hero so the upward drift never shows an edge) */}
      <div className="hero-dust absolute inset-x-0 top-0 h-[calc(100%+320px)] opacity-70" />
      {/* Film grain (oversized by one tile on every side for the same reason) */}
      <div className="hero-grain absolute -inset-[160px] opacity-[0.06] mix-blend-overlay" />
    </div>
  );
}
