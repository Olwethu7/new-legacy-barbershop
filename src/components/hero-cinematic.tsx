"use client";

import Image, { type StaticImageData } from "next/image";
import { useSyncExternalStore } from "react";
import { motion, useReducedMotion, type Easing, type Transition } from "framer-motion";
import { EASE_LUXE } from "@/lib/motion";
import barberImage from "../../public/gallery/Stylized_Barber_Portrait_with_Wahl_Clippers-removebg-preview.png";
import m1 from "../../public/gallery/M1.jpg";
import m2 from "../../public/gallery/M2.webp";
import m3 from "../../public/gallery/M3.webp";

/**
 * Homepage hero loop: the barber portrait hands over to a three-photo collage and back.
 *
 *   0.0s – 3.0s   Idle: portrait.
 *   3.0s – 4.6s   Portrait dims to black (brightness 100% → 0) and fades.
 *   3.4s – 5.2s   Collage arrives:
 *                   desktop  M1 + M2 drop from the top, M3 rises from the bottom
 *                   mobile   M1 slides from the left, M2 from the right, M3 pops up in the centre
 *   5.2s – 8.0s   Hold.
 *   8.0s – 9.4s   Collage leaves the way it came.
 *   8.6s – 10.2s  Portrait brightens back to 100%.
 *  10.2s – 11.0s  Idle, then repeat.
 *
 * "Reduce motion" visitors get the same sequence as gentle crossfades: no sliding, scaling or spinning.
 */
const CYCLE = 11;
/** Lets the page's entrance animation finish before the first loop. */
const START_DELAY = 1.2;

const EASE_IN: Easing = EASE_LUXE;
const EASE_OUT: Easing = [0.64, 0, 0.78, 0]; // mirror of EASE_LUXE: accelerates away
const EASE_FADE: Easing = [0.65, 0, 0.35, 1];

/** A keyframe track: still → arrive → hold → leave → still. Times in seconds. */
function loop(arrive: number, landed: number, leave: number, gone: number, ease: [Easing, Easing]): Transition {
  return {
    duration: CYCLE,
    times: [0, arrive, landed, leave, gone, CYCLE].map((s) => s / CYCLE),
    ease: ["linear", ease[0], "linear", ease[1], "linear"],
    delay: START_DELAY,
    repeat: Infinity,
  };
}

// ---------- Layout switch (Tailwind's `lg` breakpoint) ----------

const DESKTOP_QUERY = "(min-width: 1024px)";
function subscribe(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
/** True on large screens. The server renders the mobile layout; React swaps it after hydration if needed. */
function useIsDesktop() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(DESKTOP_QUERY).matches, () => false);
}

// ---------- The three photos ----------

type Offscreen = { x?: string; y?: string; scale?: number; rotate: number };

type Shot = {
  key: string;
  src: StaticImageData;
  /** Position inside the collage box (percent of its width/height). */
  className: string;
  /** Angle it settles at. */
  tilt: number;
  /** Where it waits off-stage, per layout. */
  from: { desktop: Offscreen; mobile: Offscreen };
  /** Seconds: starts arriving, has landed, starts leaving, has left. */
  timing: { desktop: [number, number, number, number]; mobile: [number, number, number, number] };
  imageClassName?: string;
};

const shots: Shot[] = [
  {
    key: "m1",
    src: m1,
    className: "left-[3%] top-0 h-[54%] w-[45%]",
    tilt: -5,
    from: { desktop: { y: "-160%", rotate: -14 }, mobile: { x: "-150%", rotate: -12 } },
    timing: { desktop: [3.4, 5.0, 8.0, 9.3], mobile: [3.4, 5.0, 8.0, 9.3] },
    imageClassName: "object-[50%_25%]",
  },
  {
    key: "m2",
    src: m2,
    // Same size and top edge as M1: the pair sits perfectly side by side.
    className: "right-[3%] top-0 h-[54%] w-[45%]",
    tilt: 4,
    from: { desktop: { y: "-160%", rotate: 12 }, mobile: { x: "150%", rotate: 12 } },
    timing: { desktop: [3.5, 5.1, 8.1, 9.4], mobile: [3.4, 5.0, 8.0, 9.3] },
  },
  {
    key: "m3",
    src: m3,
    // Centred under the pair; its top overlaps them and its bottom drops ~10% lower, so it never lines up.
    className: "left-1/2 top-[42%] z-10 h-[52%] w-[50%] -translate-x-1/2",
    tilt: -2,
    from: { desktop: { y: "170%", rotate: 10 }, mobile: { scale: 0.55, rotate: -2 } },
    // On mobile M3 takes its time: a slow pop once the pair has arrived.
    timing: { desktop: [3.6, 5.2, 8.0, 9.3], mobile: [4.0, 5.6, 8.0, 9.2] },
  },
];

function shotAnimation(shot: Shot, layout: "desktop" | "mobile", reduce: boolean) {
  const [arrive, landed, leave, gone] = shot.timing[layout];
  const transition = loop(arrive, landed, leave, gone, reduce ? [EASE_FADE, EASE_FADE] : [EASE_IN, EASE_OUT]);
  const opacity = [0, 0, 1, 1, 0, 0];

  if (reduce) {
    // Already in place and tilted; only the opacity changes.
    return { initial: { opacity: 0, rotate: shot.tilt }, animate: { opacity }, transition };
  }

  const off = shot.from[layout];
  const track = <T,>(away: T, home: T) => [away, away, home, home, away, away];
  const animate: Record<string, (string | number)[]> = { opacity, rotate: track(off.rotate, shot.tilt) };
  if (off.x !== undefined) animate.x = track(off.x, "0%");
  if (off.y !== undefined) animate.y = track(off.y, "0%");
  if (off.scale !== undefined) animate.scale = track(off.scale, 1);

  return { initial: { opacity: 0, rotate: off.rotate, x: off.x ?? 0, y: off.y ?? 0, scale: off.scale ?? 1 }, animate, transition };
}

// ---------- Component ----------

export function HeroCinematic() {
  const reduce = useReducedMotion() ?? false;
  const layout = useIsDesktop() ? "desktop" : "mobile";
  const portraitTiming = loop(3.0, 4.6, 8.6, 10.2, [EASE_FADE, EASE_FADE]);

  return (
    // Keyed by layout so every track restarts together (in sync) when the screen crosses the breakpoint.
    <div key={layout} className="relative">
      <motion.div
        initial={{ filter: "brightness(1)", opacity: 1 }}
        animate={{
          filter: ["brightness(1)", "brightness(1)", "brightness(0)", "brightness(0)", "brightness(1)", "brightness(1)"],
          opacity: [1, 1, 0, 0, 1, 1],
        }}
        transition={portraitTiming}
      >
        <Image
          src={barberImage}
          alt="Mr Barber, founder of New Legacy Barbershop, holding Wahl clippers"
          preload
          sizes="(min-width: 1024px) 480px, (min-width: 640px) 380px, 300px"
          className="h-[25rem] w-auto max-w-full object-contain [mask-image:linear-gradient(to_bottom,black_68%,transparent_98%)] sm:h-[32rem] lg:h-[min(40rem,calc(100svh-7rem))]"
        />
      </motion.div>

      {/* The collage lands where the portrait was: a square a little wider than the portrait. */}
      <div aria-hidden="true" className="pointer-events-none absolute -inset-x-[10%] top-[6%] aspect-square">
        {shots.map((shot) => {
          const { initial, animate, transition } = shotAnimation(shot, layout, reduce);
          return (
            // Outer div positions (incl. M3's centring translate); inner motion.div animates.
            <div key={shot.key} className={`absolute ${shot.className}`}>
              <motion.div className="size-full" initial={initial} animate={animate} transition={transition}>
                <div className="relative size-full overflow-hidden rounded-2xl bg-charcoal-soft shadow-[0_30px_60px_-18px_rgba(0,0,0,0.85),0_0_0_1px_rgba(201,162,39,0.45)]">
                  <Image
                    src={shot.src}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 280px, (min-width: 640px) 220px, 170px"
                    className={`object-cover ${shot.imageClassName ?? ""}`}
                  />
                  {/* Hairline + soft sheen so they read as printed photos */}
                  <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
                  <span className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-white/10" />
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
