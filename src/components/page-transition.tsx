"use client";

import { ViewTransition } from "react";
import { usePathname } from "next/navigation";

/**
 * Fades the old page out and the new page in when the visitor follows a link.
 * Uses the browser's View Transitions API, so the animation runs on the GPU
 * and the old page can fade out properly (not possible with Framer Motion in the App Router).
 * Browsers without support just navigate normally. Styles live in globals.css (.page-out / .page-in).
 *
 * Keyed by pathname so it only animates on route changes, not on other updates like adding to cart.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <ViewTransition key={pathname} enter="page-in" exit="page-out" default="none">
      {children}
    </ViewTransition>
  );
}
