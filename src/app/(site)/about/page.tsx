import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Award, Car, Crown, Scissors } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { ScrollReveal, Stagger, StaggerItem } from "@/components/scroll-reveal";
import { SectionHeading } from "@/components/section-heading";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { whatsappBookingUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "The story of New Legacy Barbershop: a personal, mobile barbering experience that began in 2023, from Bizana to Durban.",
};

const values = [
  {
    icon: Award,
    title: "Independent & Self-Made",
    text: "No franchise and no shortcuts. New Legacy was built one client at a time, with skill, discipline and a lot of heart.",
  },
  {
    icon: Car,
    title: "Mobile & Flexible",
    text: "Home, work or a special event, we bring the chair to you. Bookings fit around your day, from Bizana to Durban.",
  },
  {
    icon: Crown,
    title: "A Lasting Legacy",
    text: "Every cut is part of something bigger. We grow with our clients and our community, and build something that lasts.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Our Story"
        title={
          <>
            More than a cut.
            <br />
            <span className="text-gold">A legacy.</span>
          </>
        }
      />

      {/* Story */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-8">
          <ScrollReveal>
            <SectionHeading eyebrow="Since 2023" title="Where it began" />
            <div className="mt-10 flex items-end gap-4">
              <span className="font-display text-[7rem] leading-[0.8] text-gold sm:text-[9rem]">2023</span>
            </div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.3em] text-charcoal/50">
              The first chair. The first client.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.08} className="space-y-6 text-lg leading-relaxed text-charcoal/75">
            <p className="text-2xl leading-snug text-charcoal sm:text-3xl">
              Welcome to <span className="font-semibold">New Legacy Barbershop</span>, a unique and personal barbering
              experience that began in 2023.
            </p>
            <p>
              What started with a pair of clippers and a lot of determination has grown into a trusted name from
              Bizana Nomlacu to Durban CBD. We&apos;re not a big chain. We&apos;re a barber who knows your name,
              remembers your cut and takes pride in sending you out looking your best.
            </p>
            <p>
              We&apos;re mobile, so the chair comes to you. Every appointment gets the same care, whether it&apos;s a
              quick trim or a fresh fade with dye.
            </p>
            <p className="border-l-2 border-gold pl-5 font-display text-3xl leading-tight tracking-wide text-charcoal">
              Growing together, leaving a legacy.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Founder spotlight */}
      <section className="bg-charcoal py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
          <article className="relative grid overflow-hidden rounded-3xl border border-gold/30 bg-charcoal-soft md:grid-cols-[0.9fr_1.1fr]">
            {/* Portrait placeholder: swap for a real photo later */}
            <div className="relative flex min-h-80 items-center justify-center bg-[radial-gradient(circle_at_center,rgba(201,162,39,0.22),transparent_70%)]">
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-[0.05] [background-image:repeating-linear-gradient(135deg,#fff_0_1px,transparent_1px_14px)]"
              />
              <div className="relative flex size-44 items-center justify-center rounded-full border-2 border-gold/60 bg-charcoal sm:size-52">
                <Scissors className="size-16 text-gold sm:size-20" strokeWidth={1.25} />
              </div>
            </div>

            <div className="p-8 sm:p-12 lg:p-16">
              <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-gold">
                <span className="h-px w-8 bg-gold" />
                Founder Spotlight
              </p>
              <h2 className="mt-5 font-display text-6xl leading-[0.9] tracking-wide text-offwhite sm:text-7xl">
                Mr Barber
              </h2>
              <p className="mt-2 font-display text-2xl tracking-wider text-gold sm:text-3xl">
                The Barber with SuperGlue
              </p>
              <p className="mt-6 max-w-lg leading-relaxed text-offwhite/65">
                The name says it all: lines that stick, fades that hold and clients who keep coming back. Mr Barber
                built New Legacy from the ground up, with a steady hand and a promise that every client leaves
                feeling like the best version of themselves.
              </p>
              <a
                href={whatsappBookingUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-luxe mt-8 inline-flex items-center gap-2.5 rounded-full bg-gold px-7 py-3.5 font-semibold text-charcoal hover:bg-gold-light"
              >
                <WhatsAppIcon className="size-5" />
                Book with Mr Barber
              </a>
            </div>
          </article>
          </ScrollReveal>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <SectionHeading eyebrow="What We Stand For" title="Our values" align="center" />
          </ScrollReveal>
          <Stagger className="mt-14 grid gap-5 md:grid-cols-3">
            {values.map(({ icon: Icon, title, text }, i) => (
              <StaggerItem key={title} className="h-full">
              <article
                className="group relative h-full overflow-hidden rounded-2xl border border-charcoal/10 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gold hover:shadow-xl hover:shadow-gold/10"
              >
                <span className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gold transition-transform duration-300 group-hover:scale-x-100" />
                <div className="flex items-center justify-between">
                  <div className="flex size-12 items-center justify-center rounded-full bg-charcoal text-gold">
                    <Icon className="size-5" />
                  </div>
                  <span className="font-display text-5xl leading-none text-charcoal/10">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-3xl tracking-wide text-charcoal">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-charcoal/65">{text}</p>
              </article>
              </StaggerItem>
            ))}
          </Stagger>

          <ScrollReveal className="mt-14 text-center">
            <Link
              href="/services"
              className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-charcoal transition-colors hover:text-gold"
            >
              <span className="link-draw">See our services</span>
              <ArrowRight className="size-4" />
            </Link>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
