import { ArrowRight } from "lucide-react";
import { formatRand, type Service } from "@/lib/services";
import { whatsappBookingUrl } from "@/lib/site";

type Props = {
  service: Service;
  index: number;
  tone?: "light" | "dark";
};

export function ServiceCard({ service, index, tone = "light" }: Props) {
  const dark = tone === "dark";

  return (
    // Lifts 5px on hover. The deeper shadow lives on a separate layer that fades in,
    // which is far cheaper for the browser than animating box-shadow directly.
    <article
      className={`group relative flex h-full flex-col rounded-2xl border p-7 transition-[translate,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[5px] after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:rounded-2xl after:opacity-0 after:transition-opacity after:duration-500 after:ease-[cubic-bezier(0.22,1,0.36,1)] hover:after:opacity-100 ${
        dark
          ? "isolate border-white/10 bg-charcoal-soft after:shadow-[0_24px_50px_-18px_rgba(0,0,0,0.8),0_0_40px_-12px_rgba(201,162,39,0.25)] hover:border-gold/60"
          : "isolate border-charcoal/10 bg-white shadow-sm after:shadow-[0_24px_50px_-20px_rgba(17,17,17,0.35),0_10px_30px_-12px_rgba(201,162,39,0.3)] hover:border-gold"
      }`}
    >
      {/* Gold accent line that grows on hover (clipped to the card's rounded top) */}
      <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <span className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gold transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
      </span>

      <div className="flex items-start justify-between gap-4">
        <span className={`font-display text-lg tracking-widest ${dark ? "text-offwhite/30" : "text-charcoal/25"}`}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <span
          className={`font-display text-5xl leading-none transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-gold ${
            dark ? "text-offwhite" : "text-charcoal"
          }`}
        >
          {formatRand(service.price)}
        </span>
      </div>

      <h3 className={`mt-6 font-display text-3xl tracking-wide ${dark ? "text-offwhite" : "text-charcoal"}`}>
        {service.name}
      </h3>
      <p className={`mt-2 flex-1 text-sm leading-relaxed ${dark ? "text-offwhite/60" : "text-charcoal/65"}`}>
        {service.description}
      </p>

      {service.addOn && (
        <div
          className={`mt-5 flex items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-3 ${
            dark ? "border-gold/30 bg-gold/5" : "border-gold/50 bg-gold/5"
          }`}
        >
          <span className={`text-sm ${dark ? "text-offwhite/80" : "text-charcoal/80"}`}>
            <span className="font-semibold text-gold">+</span> With {service.addOn.name}
          </span>
          <span className="font-display text-2xl leading-none text-gold">{formatRand(service.addOn.price)}</span>
        </div>
      )}

      <a
        href={whatsappBookingUrl(service.name)}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-6 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] transition-colors ${
          dark ? "text-offwhite/80 hover:text-gold" : "text-charcoal hover:text-gold"
        }`}
      >
        Book this
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
      </a>
    </article>
  );
}
