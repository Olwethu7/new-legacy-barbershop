import type { Metadata } from "next";
import { SectionHeading } from "@/components/section-heading";
import { ServiceCard } from "@/components/service-card";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { formatRand, services } from "@/lib/services";
import { whatsappBookingUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Services & Prices",
  description: "Trims from R15, shaves and brushes from R30, fades and cuts for R50. Mobile barbering in Bizana and Durban.",
};

const withAddOns = services.filter((s) => s.addOn);

export default function ServicesPage() {
  return (
    <>
      {/* Page header */}
      <section className="relative isolate overflow-hidden bg-charcoal text-offwhite">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(201,162,39,0.16),transparent_60%)]"
        />
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.35em] text-gold">
            <span className="h-px w-10 bg-gold" />
            Services &amp; Prices
          </p>
          <h1 className="mt-6 font-display text-[clamp(3.5rem,10vw,7.5rem)] leading-[0.9] tracking-wide">
            Sharp work.
            <br />
            <span className="text-gold">Honest prices.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-offwhite/70">
            Every service comes with the same attention to detail, whether you book a quick trim or a full fade.
            Mobile appointments are available in Bizana and Durban.
          </p>
        </div>
      </section>

      {/* All services */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="The Menu" title="Our services" />
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {services.map((service, i) => (
              <ServiceCard key={service.name} service={service} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Add-ons price list */}
      <section className="bg-charcoal py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:gap-20 lg:px-8">
          <SectionHeading
            eyebrow="Add-ons"
            title="Level up your visit"
            description="Upgrade your service with a deep clean or a fresh dye. Prices shown are the total for the service with the add-on."
            tone="dark"
          />

          <ul className="divide-y divide-white/10 border-y border-white/10">
            {withAddOns.map((service) => (
              <li key={service.name}>
                <a
                  href={whatsappBookingUrl(`${service.name} + ${service.addOn!.name}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-baseline gap-4 py-5 transition-colors"
                >
                  <span className="font-display text-2xl tracking-wide text-offwhite transition-colors group-hover:text-gold sm:text-3xl">
                    {service.name}
                    <span className="text-gold"> + </span>
                    {service.addOn!.name}
                  </span>
                  <span aria-hidden="true" className="mb-1.5 flex-1 border-b border-dotted border-white/20" />
                  <span className="font-display text-3xl leading-none text-gold sm:text-4xl">
                    {formatRand(service.addOn!.price)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Booking CTA */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-display text-5xl leading-[0.95] tracking-wide text-charcoal sm:text-6xl">
            Not sure what to get?
          </h2>
          <p className="mt-4 text-charcoal/65">
            Send a message on WhatsApp and we&apos;ll help you pick the right cut. Mobile visits are booked the same way.
          </p>
          <a
            href={whatsappBookingUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2.5 rounded-full bg-gold px-8 py-4 font-semibold text-charcoal transition-colors hover:bg-gold-light"
          >
            <WhatsAppIcon className="size-5" />
            Book on WhatsApp
          </a>
        </div>
      </section>
    </>
  );
}
