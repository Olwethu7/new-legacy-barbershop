"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { GalleryImage } from "@/lib/gallery";
import { EASE_LUXE, REVEAL, STAGGER } from "@/lib/motion";
import { formatRand } from "@/lib/services";

/** Images on screen at load stagger in one after another; the rest reveal as you scroll. */
const INITIAL_BATCH = 6;

export function GalleryGrid({ images }: { images: GalleryImage[] }) {
  return (
    <ul className="columns-1 gap-5 sm:columns-2 lg:columns-3">
      {images.map((image, i) => {
        const featured = i === 0;

        return (
          <motion.li
            key={image.src}
            className="mb-5 break-inside-avoid"
            // Fades up 20px. Transform + opacity only, so no layout shift.
            initial={{ opacity: 0, y: REVEAL.y }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -40px 0px" }}
            transition={{
              duration: REVEAL.duration,
              ease: EASE_LUXE,
              // First screenful staggers in order; later rows stagger across the 3 columns.
              delay: i < INITIAL_BATCH ? 0.1 + i * STAGGER : (i % 3) * STAGGER,
            }}
          >
            <figure className="group relative isolate rounded-2xl">
              {/* Gold glow: a pre-drawn shadow that only fades in (cheaper than animating box-shadow) */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10 rounded-2xl opacity-0 shadow-[0_0_0_1px_rgba(201,162,39,0.5),0_18px_50px_-12px_rgba(201,162,39,0.45)] transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100"
              />

              <div className="relative overflow-hidden rounded-2xl bg-charcoal-soft">
                {/* The featured photo breathes very slowly; the hover zoom sits on the image inside it. */}
                <div className={featured ? "breathe" : undefined}>
                  <Image
                    src={image.src}
                    alt={image.alt}
                    width={image.width}
                    height={image.height}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    preload={i < 2}
                    className="h-auto w-full transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                  />
                </div>

                {/* Vignette so the text stays readable. Touch screens can't hover, so it's always on there. */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/10 to-transparent opacity-0 transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100 [@media(hover:none)]:opacity-100" />
                {/* Gold ring */}
                <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 transition-opacity duration-700 group-hover:opacity-0" />
                <span className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 ring-2 ring-inset ring-gold/80 transition-opacity duration-700 group-hover:opacity-100" />

                {/* Name of the cut + price: fades in and settles up into place on hover */}
                {(image.caption || image.price !== undefined) && (
                  <figcaption className="pointer-events-none absolute inset-x-5 bottom-5 flex translate-y-3 items-end justify-between gap-4 opacity-0 transition-[opacity,translate] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0 group-hover:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100">
                    <span className="min-w-0">
                      <span className="block text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-gold/80">
                        The Cut
                      </span>
                      <span className="mt-1 block font-display text-2xl leading-none tracking-wide text-offwhite">
                        {image.caption ?? "Signature Cut"}
                      </span>
                    </span>
                    {image.price !== undefined && (
                      <span className="shrink-0 rounded-full border border-gold/50 bg-charcoal/70 px-3.5 py-1.5 font-display text-xl leading-none tracking-wide text-gold backdrop-blur-sm">
                        {formatRand(image.price)}
                      </span>
                    )}
                  </figcaption>
                )}
              </div>
            </figure>
          </motion.li>
        );
      })}
    </ul>
  );
}
