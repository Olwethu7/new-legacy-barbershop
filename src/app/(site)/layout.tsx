import { CartDrawer } from "@/components/cart-drawer";
import { PageTransition } from "@/components/page-transition";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WhatsAppFloat } from "@/components/whatsapp-float";
import { CartProvider } from "@/context/cart-context";

/** Public website chrome: header, footer, cart and WhatsApp button. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <SiteHeader />
      <main className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
      <SiteFooter />
      <WhatsAppFloat />
      <CartDrawer />
    </CartProvider>
  );
}
