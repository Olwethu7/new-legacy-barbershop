import type { Metadata } from "next";
import { CalendarDays, Mail, MapPin, Phone } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { ScrollReveal, Stagger, StaggerItem } from "@/components/scroll-reveal";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { site, whatsappBookingUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Call, WhatsApp or email New Legacy Barbershop. Find us in Bizana Nomlacu and Durban CBD.",
};

const contactMethods = [
  {
    icon: Phone,
    label: "Call",
    value: site.phoneDisplay,
    href: site.phoneHref,
    external: false,
  },
  {
    icon: WhatsAppIcon,
    label: "WhatsApp",
    value: site.phoneDisplay,
    href: site.whatsappUrl,
    external: true,
  },
  {
    icon: Mail,
    label: "Email",
    value: site.email,
    href: `mailto:${site.email}`,
    external: false,
  },
];

const locations = [
  {
    name: "Bizana Nomlacu",
    season: "During the holidays",
    text: "Home base for the festive season and school holidays. Mobile visits are available in and around Nomlacu.",
  },
  {
    name: "Durban CBD",
    season: "After the holidays",
    text: "Back in the city once the holidays end. Book a mobile visit at home, at work or for an event.",
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title={
          <>
            Let&apos;s get you
            <br />
            <span className="text-gold">looking fresh.</span>
          </>
        }
        description="The fastest way to book is WhatsApp. Send your preferred service, day and location, and we'll confirm your slot."
      />

      {/* Contact methods */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Stagger className="grid gap-5 md:grid-cols-3">
            {contactMethods.map(({ icon: Icon, label, value, href, external }) => (
              <StaggerItem key={label} className="h-full">
              <a
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="group relative block h-full overflow-hidden rounded-2xl border border-charcoal/10 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gold hover:shadow-xl hover:shadow-gold/10"
              >
                <span className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gold transition-transform duration-300 group-hover:scale-x-100" />
                <div className="flex size-12 items-center justify-center rounded-full bg-charcoal text-gold">
                  <Icon className="size-5" />
                </div>
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-charcoal/50">{label}</p>
                <p className="mt-2 break-all font-display text-3xl tracking-wide text-charcoal transition-colors group-hover:text-gold">
                  {value}
                </p>
              </a>
              </StaggerItem>
            ))}
          </Stagger>

          {/* Big WhatsApp CTA */}
          <ScrollReveal className="relative mt-10 overflow-hidden rounded-3xl bg-charcoal px-6 py-14 text-center sm:px-12 sm:py-20">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,162,39,0.18),transparent_65%)]"
            />
            <div className="relative">
              <h2 className="font-display text-5xl leading-[0.95] tracking-wide text-offwhite sm:text-7xl">
                Ready to book?
              </h2>
              <p className="mx-auto mt-4 max-w-md text-offwhite/65">
                Tap below and send us a message. We usually reply quickly.
              </p>
              <a
                href={whatsappBookingUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-luxe mt-10 inline-flex w-full items-center justify-center gap-3 rounded-full bg-gold px-10 py-5 text-lg font-bold text-charcoal shadow-lg shadow-gold/20 hover:bg-gold-light sm:w-auto sm:px-14 sm:py-6 sm:text-xl"
              >
                <WhatsAppIcon className="size-7" />
                Chat on WhatsApp
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Locations */}
      <section className="bg-charcoal py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-gold">
              <span className="h-px w-8 bg-gold" />
              Where to find us
            </p>
            <h2 className="mt-4 font-display text-5xl leading-[0.95] tracking-wide text-offwhite sm:text-6xl">
              Two locations, one standard
            </h2>
          </ScrollReveal>

          <Stagger className="mt-14 grid gap-5 md:grid-cols-2">
            {locations.map((loc) => (
              <StaggerItem key={loc.name} className="h-full">
              <article className="h-full rounded-2xl border border-white/10 bg-charcoal-soft p-8 sm:p-10">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex size-12 items-center justify-center rounded-full border border-gold/50 text-gold">
                    <MapPin className="size-5" />
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                    <CalendarDays className="size-3.5" />
                    {loc.season}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-4xl tracking-wide text-offwhite sm:text-5xl">{loc.name}</h3>
                <p className="mt-3 leading-relaxed text-offwhite/60">{loc.text}</p>
              </article>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>
    </>
  );
}
