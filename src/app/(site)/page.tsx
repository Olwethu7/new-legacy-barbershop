import Image from "next/image";
import Link from "next/link";
import * as m from "framer-motion/client";
import { ArrowRight, Car, Crown, Sparkles, Award } from "lucide-react";
import { MagneticLink } from "@/components/magnetic-link";
import { Parallax } from "@/components/parallax";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SectionHeading } from "@/components/section-heading";
import { ServiceCard } from "@/components/service-card";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { EASE_LUXE } from "@/lib/motion";
import { featuredServiceNames, services } from "@/lib/services";
import { whatsappBookingUrl } from "@/lib/site";
import barberImage from "../../../public/gallery/Stylized_Barber_Portrait_with_Wahl_Clippers-removebg-preview.png";

const reasons = [
  {
    icon: Award,
    title: "Independent & Self-Made",
    text: "Built from the ground up with hard work and a steady hand. No franchise, just pride in every cut.",
  },
  {
    icon: Car,
    title: "Mobile & Flexible",
    text: "Home, office or event, we bring the chair to you. Booking fits around your schedule, not ours.",
  },
  {
    icon: Sparkles,
    title: "The Barber with SuperGlue",
    text: "Lines that stick and fades that hold. Our clients keep coming back, and so does the fresh look.",
  },
  {
    icon: Crown,
    title: "Building a Legacy",
    text: "Every client is part of the story. We grow together, from Bizana Nomlacu to Durban CBD.",
  },
];

const featured = services.filter((s) => featuredServiceNames.includes(s.name));

/** Hero entrance timeline (seconds). */
const heroIn = (delay: number, duration = 1) => ({ duration, delay, ease: EASE_LUXE });

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-charcoal text-offwhite">
        {/* Background: pure charcoal with one smooth, faint warm light. No patterns. */}
        <m.div
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={heroIn(0, 2.4)}
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_60%_at_75%_45%,rgba(201,162,39,0.09),transparent_70%),linear-gradient(180deg,#141414_0%,#111111_60%)]"
        />

        <div className="mx-auto grid max-w-7xl items-center gap-y-16 px-4 pt-24 sm:px-6 sm:pt-32 lg:min-h-[calc(100svh-4.5rem)] lg:grid-cols-[1.1fr_0.9fr] lg:gap-x-12 lg:px-8 lg:pt-0">
          {/* Left: text */}
          <div className="min-w-0 lg:py-28">
            <m.p
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={heroIn(0.1, 0.9)}
              className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.35em] text-gold"
            >
              <m.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={heroIn(0.2, 1.2)}
                className="h-px w-10 origin-left bg-gold"
              />
              Bizana &middot; Durban
            </m.p>

            {/* Bebas Neue has a single weight, so a thin same-colour stroke adds extra heft. */}
            <h1 className="mt-8 font-display text-[clamp(3rem,13vw,7rem)] leading-[0.86] tracking-[0.01em] [-webkit-text-stroke:1.5px_currentColor] lg:text-[clamp(5rem,7.2vw,8.5rem)]">
              <m.span
                className="block [text-shadow:0_4px_30px_rgba(0,0,0,0.6)]"
                initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={heroIn(0.25, 1.6)}
              >
                Growing Together,
              </m.span>
              <m.span
                className="block"
                initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={heroIn(0.55, 1.6)}
              >
                {/* Glow lives on an inner span so the blur-in animation doesn't overwrite it */}
                <span className="text-gold [text-shadow:0_0_32px_rgba(201,162,39,0.45),0_0_10px_rgba(201,162,39,0.3)]">
                  Leaving a Legacy
                </span>
              </m.span>
            </h1>

            <m.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={heroIn(1.0, 1.1)}
              className="mt-8 max-w-xl text-lg leading-relaxed text-offwhite/70 sm:text-xl"
            >
              <span className="font-semibold text-offwhite">The Barber with SuperGlue.</span> Premium mobile
              barbering from Bizana to Durban.
            </m.p>

            <m.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={heroIn(1.25, 1.1)}
              className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
            >
              <MagneticLink
                href={whatsappBookingUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 rounded-full bg-gold px-8 py-4 font-semibold text-charcoal shadow-[0_10px_40px_-10px_rgba(201,162,39,0.6)] transition-[background-color,box-shadow] duration-500 hover:bg-gold-light hover:shadow-[0_16px_50px_-10px_rgba(201,162,39,0.75)]"
              >
                <WhatsAppIcon className="size-5" />
                Book on WhatsApp
              </MagneticLink>
              <Link
                href="/services"
                className="group inline-flex items-center justify-center gap-2 rounded-full border border-offwhite/25 px-8 py-4 font-semibold text-offwhite transition-colors duration-500 hover:border-gold hover:text-gold"
              >
                View Services
                <ArrowRight className="size-4 transition-transform duration-500 group-hover:translate-x-1" />
              </Link>
            </m.div>

            <m.dl
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={heroIn(1.6, 1.4)}
              className="mt-14 grid max-w-xl grid-cols-3 gap-6 border-t border-white/10 pt-8"
            >
              {[
                { value: "R15", label: "Cuts from" },
                { value: "2", label: "Locations" },
                { value: "Mobile", label: "We come to you" },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd className="font-display text-4xl text-gold sm:text-5xl">{stat.value}</dd>
                  <dd className="mt-1 text-xs uppercase tracking-[0.2em] text-offwhite/50">{stat.label}</dd>
                </div>
              ))}
            </m.dl>
          </div>

          {/* Right: the barber. No background, border or shadow on any wrapper, so he sits directly on the charcoal. */}
          <div className="relative flex items-end justify-center self-end">
            {/* Soft gold light behind head and shoulders */}
            <m.div
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={heroIn(0.5, 2.4)}
              className="pointer-events-none absolute inset-x-0 top-0 mx-auto aspect-square w-[95%] max-w-[34rem]"
            >
              <m.div
                animate={{ opacity: [0.85, 1, 0.85], scale: [1, 1.05, 1] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="relative size-full"
              >
                {/* Radial falloff + heavy blur = light, not a disc */}
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_42%,rgba(201,162,39,0.32)_0%,rgba(201,162,39,0.14)_32%,rgba(201,162,39,0.04)_55%,transparent_70%)] blur-3xl" />
                <div className="absolute inset-[22%] -translate-y-[8%] rounded-full bg-[radial-gradient(circle,rgba(224,189,74,0.22)_0%,transparent_70%)] blur-3xl" />
              </m.div>
            </m.div>

            {/* The barber slides up into place, then scrolls a little slower than the page (parallax) */}
            <Parallax distance={140} className="relative">
              <m.div
                initial={{ opacity: 0, y: 80 }}
                animate={{ opacity: 1, y: 0 }}
                transition={heroIn(0.6, 1.8)}
              >
                <Image
                  src={barberImage}
                  alt="Mr Barber, founder of New Legacy Barbershop, holding Wahl clippers"
                  preload
                  sizes="(min-width: 1024px) 480px, (min-width: 640px) 380px, 300px"
                  className="h-[25rem] w-auto max-w-full object-contain [mask-image:linear-gradient(to_bottom,black_68%,transparent_98%)] sm:h-[32rem] lg:h-[min(40rem,calc(100svh-7rem))]"
                />
              </m.div>
            </Parallax>
          </div>
        </div>

        {/* Lets the bottom of the hero melt into the charcoal instead of ending on a hard line */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-charcoal to-transparent" />
      </section>

      {/* Why Choose Us */}
      <section className="bg-offwhite py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <SectionHeading
              eyebrow="Why Choose Us"
              title="More than a haircut"
              description="Sharp work, honest prices and a barber who shows up. That's the New Legacy standard."
            />
          </ScrollReveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {reasons.map(({ icon: Icon, title, text }, i) => (
              <ScrollReveal key={title} delay={i * 0.12} className="h-full">
                <div className="group relative h-full rounded-2xl border border-charcoal/10 bg-white/60 p-8 transition-all duration-500 hover:-translate-y-1 hover:border-gold/60 hover:bg-white hover:shadow-xl hover:shadow-gold/10">
                  <span className="absolute right-6 top-6 font-display text-6xl leading-none text-charcoal/5 transition-colors duration-500 group-hover:text-gold/20">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex size-12 items-center justify-center rounded-full bg-charcoal text-gold transition-transform duration-500 group-hover:scale-110">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-6 font-display text-2xl tracking-wide text-charcoal">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-charcoal/65">{text}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Services preview */}
      <section className="bg-charcoal py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading eyebrow="Services" title="Fresh cuts, fair prices" tone="dark" />
            <Link
              href="/services"
              className="group inline-flex shrink-0 items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-gold transition-colors hover:text-gold-light"
            >
              All services
              <ArrowRight className="size-4 transition-transform duration-500 group-hover:translate-x-1" />
            </Link>
          </ScrollReveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((service, i) => (
              <ScrollReveal key={service.name} delay={i * 0.12} className="h-full">
                <ServiceCard service={service} index={i} tone="dark" />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="overflow-hidden bg-gold">
        <ScrollReveal className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center lg:px-8">
          <h2 className="font-display text-4xl leading-none tracking-wide text-charcoal sm:text-5xl">
            Ready for your next fresh cut?
          </h2>
          <a
            href={whatsappBookingUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2.5 rounded-full bg-charcoal px-8 py-4 font-semibold text-offwhite transition-all duration-500 hover:-translate-y-0.5 hover:bg-charcoal-soft hover:shadow-xl hover:shadow-charcoal/30"
          >
            <WhatsAppIcon className="size-5 text-gold" />
            Book on WhatsApp
          </a>
        </ScrollReveal>
      </section>
    </>
  );
}
