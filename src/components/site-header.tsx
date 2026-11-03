"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, useMotionValueEvent, useScroll, useSpring } from "framer-motion";
import { Menu, ShoppingBag, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { useCart } from "@/context/cart-context";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { EASE_LUXE } from "@/lib/motion";
import { navLinks, whatsappBookingUrl } from "@/lib/site";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { itemCount, openCart } = useCart();

  // At the top the header blends into the dark hero. Once scrolled, a frosted layer
  // (blur, gold hairline, soft shadow) fades in. Only opacity animates, so it stays at 60fps.
  const { scrollY, scrollYProgress } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  // Slides away while scrolling down, comes straight back on any scroll up.
  const [hidden, setHidden] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => {
    setScrolled(y > 24);
    const delta = y - (scrollY.getPrevious() ?? y);
    if (y < 120) setHidden(false); // always visible near the top
    else if (delta > 6) setHidden(true); // small threshold ignores trackpad jitter
    else if (delta < 0) setHidden(false);
  });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  const solid = scrolled || open;
  const hide = hidden && !open;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <motion.header
      initial={false}
      animate={{ y: hide ? "-100%" : "0%" }}
      transition={{ duration: hide ? 0.45 : 0.35, ease: EASE_LUXE }}
      onFocusCapture={() => setHidden(false)}
      className="site-header sticky top-0 z-40 isolate"
    >
      {/* Solid charcoal at the top of the page... */}
      <motion.div
        aria-hidden="true"
        initial={false}
        animate={{ opacity: solid ? 0 : 1 }}
        transition={{ duration: 0.5, ease: EASE_LUXE }}
        className="pointer-events-none absolute inset-0 -z-10 bg-charcoal"
      />
      {/* ...crossfades to frosted glass once scrolled */}
      <motion.div
        aria-hidden="true"
        initial={false}
        animate={{ opacity: solid ? 1 : 0 }}
        transition={{ duration: 0.5, ease: EASE_LUXE }}
        className="pointer-events-none absolute inset-0 -z-10 border-b border-gold/20 bg-charcoal/78 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl backdrop-saturate-150"
      />
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={false}
          animate={{ scale: scrolled ? 0.92 : 1 }}
          transition={{ duration: 0.5, ease: EASE_LUXE }}
          className="origin-left"
        >
          <Logo />
        </motion.div>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-8">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className={`relative py-2 text-sm font-medium uppercase tracking-[0.15em] transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:bg-gold after:transition-transform after:duration-500 after:ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isActive(link.href)
                      ? "text-gold after:scale-x-100"
                      : "text-offwhite/75 after:scale-x-0 hover:text-offwhite hover:after:scale-x-100"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={openCart}
            aria-label={`Open cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
            className="relative inline-flex size-11 items-center justify-center rounded-full text-offwhite transition-colors hover:bg-white/10 hover:text-gold"
          >
            <ShoppingBag className="size-5" />
            {itemCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[0.65rem] font-bold leading-5 text-charcoal ring-2 ring-charcoal">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </button>
          <a
            href={whatsappBookingUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-luxe hidden items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-charcoal hover:bg-gold-light sm:inline-flex"
          >
            <WhatsAppIcon className="size-4" />
            Book on WhatsApp
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex size-11 items-center justify-center rounded-full text-offwhite transition-colors hover:bg-white/10 lg:hidden"
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-nav"
        className={`overflow-hidden border-t border-gold/10 bg-charcoal transition-[max-height] duration-300 lg:hidden ${
          open ? "max-h-[32rem]" : "max-h-0 border-t-0"
        }`}
      >
        <nav aria-label="Mobile" className="px-4 pb-6 pt-2 sm:px-6">
          <ul className="divide-y divide-white/5">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={`block py-3.5 font-display text-2xl tracking-wide ${
                    isActive(link.href) ? "text-gold" : "text-offwhite"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <a
            href={whatsappBookingUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-luxe mt-4 flex items-center justify-center gap-2 rounded-full bg-gold px-5 py-3.5 font-semibold text-charcoal"
          >
            <WhatsAppIcon className="size-5" />
            Book on WhatsApp
          </a>
        </nav>
      </div>
      {/* Reading progress hairline */}
      <motion.div
        aria-hidden="true"
        style={{ scaleX: progress }}
        className={`absolute inset-x-0 bottom-0 h-px origin-left bg-gradient-to-r from-gold/0 via-gold to-gold-light transition-opacity duration-500 ${
          scrolled ? "opacity-100" : "opacity-0"
        }`}
      />
    </motion.header>
  );
}
