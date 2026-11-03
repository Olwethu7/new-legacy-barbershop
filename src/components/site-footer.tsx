import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { CurrentYear } from "@/components/current-year";
import { Logo } from "@/components/logo";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { navLinks, site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-gold/15 bg-charcoal text-offwhite">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="lg:col-span-1">
          <Logo />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-offwhite/60">
            The Barber with SuperGlue. Premium mobile barbering from Bizana to Durban.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl tracking-wider text-gold">Explore</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="link-draw text-offwhite/70 transition-colors hover:text-gold">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-display text-xl tracking-wider text-gold">Get in Touch</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <a href={site.phoneHref} className="flex items-center gap-3 text-offwhite/70 transition-colors hover:text-gold">
                <Phone className="size-4 shrink-0 text-gold" />
                <span className="link-draw">{site.phoneDisplay}</span>
              </a>
            </li>
            <li>
              <a href={site.whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-offwhite/70 transition-colors hover:text-gold">
                <WhatsAppIcon className="size-4 shrink-0 text-gold" />
                <span className="link-draw">WhatsApp us</span>
              </a>
            </li>
            <li>
              <a href={`mailto:${site.email}`} className="flex items-center gap-3 break-all text-offwhite/70 transition-colors hover:text-gold">
                <Mail className="size-4 shrink-0 text-gold" />
                <span className="link-draw">{site.email}</span>
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-xl tracking-wider text-gold">Locations</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {site.locations.map((loc) => (
              <li key={loc} className="flex items-center gap-3 text-offwhite/70">
                <MapPin className="size-4 shrink-0 text-gold" />
                {loc}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-offwhite/40">Mobile service available. We come to you.</p>
        </div>
      </div>

      <div className="border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-offwhite/40 sm:flex-row sm:px-6 lg:px-8">
          <p>&copy; <CurrentYear /> {site.name}. All rights reserved.</p>
          <p className="font-display text-sm tracking-[0.2em] text-offwhite/50">{site.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
