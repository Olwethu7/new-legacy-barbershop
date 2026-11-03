"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { GalleryImage } from "@/lib/gallery";
import { EASE_LUXE } from "@/lib/motion";

/** Images on screen at load stagger in one after another; the rest reveal as you scroll. */
const INITIAL_BATCH = 6;

export function GalleryGrid({ images }: { images: GalleryImage[] }) {
  return (
    <ul className="columns-1 gap-5 sm:columns-2 lg:columns-3">
      {images.map((image, i) => (
        <motion.li
          key={image.src}
          className="mb-5 break-inside-avoid"
          // Pops in: fades up from slightly smaller. Transform + opacity only, so no layout shift.
          initial={{ opacity: 0, y: 30, scale: 0.94 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "0px 0px -40px 0px" }}
          transition={{
            duration: 0.9,
            ease: EASE_LUXE,
            delay: i < INITIAL_BATCH ? 0.2 + i * 0.1 : (i % 3) * 0.08,
          }}
        >
          <figure className="group relative overflow-hidden rounded-2xl bg-charcoal-soft">
            <Image
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              preload={i < 2}
              className="h-auto w-full transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
            />
            {/* Soft vignette that deepens on hover */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-charcoal/50 via-transparent to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
            {/* Gold border highlight */}
            <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 transition-all duration-700 group-hover:ring-2 group-hover:ring-gold/80" />
            <figcaption className="pointer-events-none absolute inset-x-5 bottom-4 flex items-end justify-between gap-4 font-display tracking-widest opacity-0 transition-all duration-700 group-hover:opacity-100">
              {image.caption && <span className="text-xl text-offwhite">{image.caption}</span>}
              <span aria-hidden="true" className="ml-auto text-lg text-gold">
                {String(i + 1).padStart(2, "0")}
              </span>
            </figcaption>
          </figure>
        </motion.li>
      ))}
    </ul>
  );
}
