"use client";

import Image from "next/image";
import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { canOptimizeImage } from "@/lib/images";

type Props = {
  /** Main image first, then extra angles. Empty when the product has no photos. */
  images: string[];
  name: string;
  soldOut?: boolean;
};

/**
 * Product photo viewer. With several images: thumbnails on the left (below on mobile)
 * swap the large image. With one image, the thumbnail strip is left out entirely.
 */
export function ProductGallery({ images, name, soldOut }: Props) {
  const [active, setActive] = useState(0);
  const current = images[Math.min(active, images.length - 1)];
  const hasThumbs = images.length > 1;

  return (
    <div className={hasThumbs ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.25fr)] lg:gap-6" : ""}>
      {/* Main image (first on mobile, centre column on desktop) */}
      <div className={hasThumbs ? "lg:order-2" : "mx-auto w-full max-w-2xl"}>
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-charcoal/10 bg-white">
          {current ? (
            <Image
              key={current}
              src={current}
              alt={hasThumbs ? `${name}, image ${active + 1} of ${images.length}` : name}
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              loading="eager"
              fetchPriority="high"
              unoptimized={!canOptimizeImage(current)}
              className={`object-contain p-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300 sm:p-10 ${
                soldOut ? "opacity-60 grayscale" : ""
              }`}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-offwhite">
              <ShoppingBag className="size-20 text-gold/60" strokeWidth={1} />
            </div>
          )}
        </div>
      </div>

      {/* Thumbnails: a row on mobile, a column on desktop. Only rendered when there's more than one photo. */}
      {hasThumbs && (
        <ul
          aria-label="Product images"
          className="flex gap-3 overflow-x-auto pb-1 lg:order-1 lg:max-h-[min(80vh,44rem)] lg:flex-col lg:items-end lg:overflow-y-auto lg:overflow-x-visible lg:pb-0 lg:pr-1"
        >
          {images.map((src, i) => {
            const selected = i === active;
            return (
              <li key={src} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  onMouseEnter={() => setActive(i)}
                  aria-label={`Show image ${i + 1} of ${images.length}`}
                  aria-current={selected ? "true" : undefined}
                  className={`relative block size-18 overflow-hidden rounded-xl border bg-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 lg:size-22 ${
                    selected
                      ? "border-gold ring-2 ring-gold/40"
                      : "border-charcoal/10 opacity-70 hover:border-charcoal/30 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="88px"
                    unoptimized={!canOptimizeImage(src)}
                    className="object-contain p-1.5"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
