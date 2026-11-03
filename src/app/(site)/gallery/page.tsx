import type { Metadata } from "next";
import { ImageIcon } from "lucide-react";
import { GalleryGrid } from "@/components/gallery-grid";
import { PageHero } from "@/components/page-hero";
import { ScrollReveal } from "@/components/scroll-reveal";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { getGalleryImages } from "@/lib/gallery";
import { whatsappBookingUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Fresh fades, clean shaves and sharp lines from New Legacy Barbershop.",
};

export default async function GalleryPage() {
  const images = await getGalleryImages();

  return (
    <>
      <PageHero
        eyebrow="Gallery"
        title={
          <>
            The work
            <br />
            <span className="text-gold">speaks for itself.</span>
          </>
        }
        description="Fresh fades, clean shaves and sharp lines. A look at the craft behind every New Legacy cut."
      />

      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {images.length > 0 ? (
            <GalleryGrid images={images} />
          ) : (
            <div className="mx-auto max-w-xl rounded-3xl border border-charcoal/10 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-charcoal text-gold">
                <ImageIcon className="size-8" strokeWidth={1.5} />
              </div>
              <h2 className="mt-6 font-display text-4xl tracking-wide text-charcoal">New photos coming soon</h2>
              <p className="mt-3 text-charcoal/60">We&apos;re putting together our latest work. Check back shortly.</p>
            </div>
          )}

          <ScrollReveal className="mt-16">
            <div className="flex flex-col items-center gap-6 rounded-3xl bg-charcoal px-6 py-12 text-center sm:py-16">
              <h2 className="font-display text-5xl leading-[0.95] tracking-wide text-offwhite sm:text-6xl">
                Want to be <span className="text-gold">next?</span>
              </h2>
              <a
                href={whatsappBookingUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-luxe inline-flex items-center gap-2.5 rounded-full bg-gold px-8 py-4 font-semibold text-charcoal hover:bg-gold-light"
              >
                <WhatsAppIcon className="size-5" />
                Book on WhatsApp
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
