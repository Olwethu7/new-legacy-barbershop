import type { Metadata } from "next";
import { Suspense } from "react";
import { AlertCircle, ShoppingBag } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { ProductCard } from "@/components/product-card";
import { Stagger, StaggerItem } from "@/components/scroll-reveal";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { getProducts } from "@/lib/products";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Shop",
  description: "Grooming products from New Legacy Barbershop. Order on WhatsApp.",
};

export default function ShopPage() {
  return (
    <>
      <PageHero
        eyebrow="Shop"
        title={
          <>
            Keep it fresh
            <br />
            <span className="text-gold">between cuts.</span>
          </>
        }
        description="Grooming essentials picked by the barber. Add to your cart and send your order on WhatsApp."
      />

      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<ProductGridSkeleton />}>
            <ProductGrid />
          </Suspense>
        </div>
      </section>
    </>
  );
}

async function ProductGrid() {
  const { products, error } = await getProducts();

  if (error) {
    return (
      <StatusMessage
        icon={<AlertCircle className="size-8" strokeWidth={1.5} />}
        title="Shop unavailable"
        text={error}
      />
    );
  }

  if (products.length === 0) {
    return (
      <StatusMessage
        icon={<ShoppingBag className="size-8" strokeWidth={1.5} />}
        title="Fresh stock coming soon"
        text="We're stocking the shelves with grooming essentials. Check back soon, or ask us on WhatsApp what's available."
        showWhatsApp
      />
    );
  }

  return (
    <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <StaggerItem key={product.id} className="h-full">
          <ProductCard product={product} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}

function StatusMessage({
  icon,
  title,
  text,
  showWhatsApp,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  showWhatsApp?: boolean;
}) {
  return (
    <div className="relative mx-auto max-w-2xl overflow-hidden rounded-3xl border border-charcoal/10 bg-white px-6 py-16 text-center shadow-sm sm:px-12 sm:py-20">
      <span className="absolute inset-x-0 top-0 h-1 bg-gold" />
      <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-charcoal text-gold">{icon}</div>
      <h2 className="mt-6 font-display text-4xl tracking-wide text-charcoal sm:text-5xl">{title}</h2>
      <p className="mx-auto mt-3 max-w-md leading-relaxed text-charcoal/60">{text}</p>
      {showWhatsApp && (
        <a
          href={`${site.whatsappUrl}?text=${encodeURIComponent("Hi New Legacy, what products do you have available?")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-luxe mt-8 inline-flex items-center gap-2.5 rounded-full bg-gold px-7 py-3.5 font-semibold text-charcoal hover:bg-gold-light"
        >
          <WhatsAppIcon className="size-5" />
          Ask on WhatsApp
        </a>
      )}
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-charcoal/10 bg-white">
          <div className="aspect-square animate-pulse bg-charcoal/10" />
          <div className="space-y-3 p-6">
            <div className="h-6 w-2/3 animate-pulse rounded bg-charcoal/10" />
            <div className="h-4 w-full animate-pulse rounded bg-charcoal/5" />
            <div className="h-11 w-full animate-pulse rounded-full bg-charcoal/10" />
          </div>
        </div>
      ))}
    </div>
  );
}
