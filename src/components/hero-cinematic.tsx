"use client";

import Image, { type StaticImageData } from "next/image";
import { motion, useReducedMotion, type Easing } from "framer-motion";
import { EASE_LUXE } from "@/lib/motion";
import barberImage from "../../public/gallery/Stylized_Barber_Portrait_with_Wahl_Clippers-removebg-preview.png";
import m1 from "../../public/gallery/M1.jpg";
import m2 from "../../public/gallery/M2.webp";
import m3 from "../../public/gallery/M3.webp";

/**
 * The homepage hero loop. Every layer shares one timeline so they never drift apart:
 *
 *   0.0s – 4.5s   Idle: the barber portrait.
 *   4.5s – 6.3s   Portrait dims to black (brightness 100% → 0) and fades.
 *   5.0s – 6.8s   M1 + M2 drop in from the top, M3 rises from the bottom, landing with a slight tilt.
 *   6.8s – 9.6s   Hold.
 *   9.6s – 11.2s  Photos leave the way they came (M1/M2 up, M3 down).
 *  10.2s – 12.0s  Portrait brightens back to 100%.
 *  12.0s – 13.0s  Idle, then the loop repeats.
 */
const CYCLE = 13;
/** Lets the page's entrance animation finish before the first loop starts. */
const START_DELAY = 1.6;

const at = (...seconds: number[]) => seconds.map((s) => s / CYCLE);

/** Soft ease-in: the mirror image of EASE_LUXE, so photos accelerate away the way they decelerated in. */
const EASE_LEAVE: Easing = [0.64, 0, 0.78, 0];
const EASE_FADE: Easing = [0.65, 0, 0.35, 1];

const loop = (times: number[], ease: Easing[]) => ({
  duration: CYCLE,
  times,
  ease,
  delay: START_DELAY,
  repeat: Infinity,
});

const heroTiming = loop(at(0, 4.5, 6.3, 10.2, 12, CYCLE), ["linear", EASE_FADE, "linear", EASE_FADE, "linear"]);

type Shot = {
  src: StaticImageData;
  /** Where the card sits inside the collage (percent of the collage box). */
  className: string;
  /** Off-screen start/end position. Negative = above, positive = below. */
  from: string;
  /** Angle while off-screen, and the angle it settles at. */
  tilt: [number, number];
  /** Seconds the card starts moving in / out (offsets make the landing feel choreographed, not mechanical). */
  inAt: number;
  outAt: number;
  imageClassName?: string;
};

const shots: Shot[] = [
  {
    src: m1,
    className: "left-[3%] top-0 h-[56%] w-[45%]",
    from: "-150%",
    tilt: [-14, -5],
    inAt: 5.0,
    outAt: 9.6,
    imageClassName: "object-[50%_25%]",
  },
  {
    src: m2,
    className: "right-[3%] top-0 h-[56%] w-[45%]",
    from: "-150%",
    tilt: [12, 4],
    inAt: 5.12,
    outAt: 9.72,
  },
  {
    src: m3,
    // Centred under M1/M2, overlapping their bottom edge so it reads as "dropped" below them.
    className: "left-[25%] top-[46%] z-10 h-[50%] w-[50%]",
    from: "160%",
    tilt: [10, -2],
    inAt: 5.3,
    outAt: 9.6,
  },
];

/** Seconds a card takes to land, and to leave. */
const LAND = 1.5;
const LEAVE = 1.4;

function shotTiming({ inAt, outAt }: Shot) {
  return loop(at(0, inAt, inAt + LAND, outAt, outAt + LEAVE, CYCLE), [
    "linear",
    EASE_LUXE,
    "linear",
    EASE_LEAVE,
    "linear",
  ]);
}

const portraitClass =
  "h-[25rem] w-auto max-w-full object-contain [mask-image:linear-gradient(to_bottom,black_68%,transparent_98%)] sm:h-[32rem] lg:h-[min(40rem,calc(100svh-7rem))]";

export function HeroCinematic() {
  const reduceMotion = useReducedMotion();

  const portrait = (
    <Image
      src={barberImage}
      alt="Mr Barber, founder of New Legacy Barbershop, holding Wahl clippers"
      preload
      sizes="(min-width: 1024px) 480px, (min-width: 640px) 380px, 300px"
      className={portraitClass}
    />
  );

  // Visitors who asked for less motion just see the portrait. The markup stays the same either way
  // (only the animation targets change), so server and browser render identical HTML.
  return (
    <div className="relative">
      <motion.div
        initial={{ filter: "brightness(1)", opacity: 1 }}
        animate={
          reduceMotion
            ? { filter: "brightness(1)", opacity: 1 }
            : {
                filter: ["brightness(1)", "brightness(1)", "brightness(0)", "brightness(0)", "brightness(1)", "brightness(1)"],
                opacity: [1, 1, 0, 0, 1, 1],
              }
        }
        transition={reduceMotion ? { duration: 0 } : heroTiming}
        style={{ willChange: "filter, opacity" }}
      >
        {portrait}
      </motion.div>

      {/* The collage lands where the portrait was. Slightly wider than the portrait so the pair has room. */}
      <div aria-hidden="true" className="pointer-events-none absolute -inset-x-[8%] top-[7%] aspect-square">
        {shots.map((shot) => {
          const [offTilt, landTilt] = shot.tilt;
          return (
            <motion.div
              key={shot.src.src}
              className={`absolute ${shot.className}`}
              initial={{ y: shot.from, rotate: offTilt, opacity: 0 }}
              animate={
                reduceMotion
                  ? { opacity: 0 }
                  : {
                      y: [shot.from, shot.from, "0%", "0%", shot.from, shot.from],
                      rotate: [offTilt, offTilt, landTilt, landTilt, offTilt, offTilt],
                      opacity: [0, 0, 1, 1, 0, 0],
                    }
              }
              transition={reduceMotion ? { duration: 0 } : shotTiming(shot)}
              style={{ willChange: "transform, opacity" }}
            >
              <div className="relative size-full overflow-hidden rounded-2xl bg-charcoal-soft shadow-[0_30px_60px_-18px_rgba(0,0,0,0.85),0_0_0_1px_rgba(201,162,39,0.45)]">
                <Image
                  src={shot.src}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 260px, (min-width: 640px) 200px, 160px"
                  className={`object-cover ${shot.imageClassName ?? ""}`}
                />
                {/* Gold hairline + a soft sheen so the cards feel like printed photos */}
                <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
                <span className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-white/10" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
