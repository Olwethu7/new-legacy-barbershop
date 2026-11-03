"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Images, LayoutDashboard, Menu, Package, ShoppingCart, X } from "lucide-react";
import { EASE_LUXE } from "@/lib/motion";
import { LogoutButton } from "@/components/admin/logout-button";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/gallery", label: "Gallery", icon: Images },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <motion.aside
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, ease: EASE_LUXE }}
      className="sticky top-0 z-30 bg-charcoal text-offwhite lg:h-svh lg:w-72 lg:shrink-0 lg:border-r lg:border-white/5">
      <div className="flex h-full flex-col">
        {/* Brand + mobile toggle */}
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4 lg:px-7 lg:py-7">
          <Link href="/admin" className="flex flex-col leading-none" onClick={() => setOpen(false)}>
            <span className="font-display text-2xl tracking-wide">
              NEW <span className="text-gold">LEGACY</span>
            </span>
            <span className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-gold/70">
              Admin Panel
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="admin-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex size-10 items-center justify-center rounded-full hover:bg-white/10 lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        <div
          id="admin-nav"
          className={`flex-1 flex-col justify-between gap-6 px-4 py-5 lg:flex lg:px-5 lg:py-8 ${open ? "flex" : "hidden"}`}
        >
          <nav aria-label="Admin">
            <p className="px-3 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-offwhite/35">Manage</p>
            <ul className="mt-3 space-y-1">
              {links.map(({ href, label, icon: Icon }, i) => {
                const active = isActive(href);
                return (
                  <motion.li
                    key={href}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 + i * 0.06, ease: EASE_LUXE }}
                  >
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                        active ? "bg-gold/10 text-gold" : "text-offwhite/70 hover:bg-white/5 hover:text-offwhite"
                      }`}
                    >
                      <span
                        className={`absolute inset-y-2 left-0 w-0.5 rounded-full bg-gold transition-opacity ${
                          active ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      <Icon className="size-[1.1rem]" />
                      {label}
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
          </nav>

          <div className="space-y-1 border-t border-white/5 pt-5">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-offwhite/60 transition-colors hover:bg-white/5 hover:text-offwhite"
            >
              <ExternalLink className="size-[1.1rem]" />
              View website
            </Link>
            <LogoutButton />
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
