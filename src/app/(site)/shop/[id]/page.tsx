import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AlertCircle, ChevronLeft } from "lucide-react";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductGallery } from "@/components/product-gallery";
import { STOCK_STATUS_LABELS, STOCK_STATUS_STYLES } from "@/lib/product-options";
import { getProduct, productImages, type Product } from "@/lib/products";
import { formatRand } from "@/lib/services";

// The site header and page transition read usePathname(), which isn't known for a product ID
// at build time. Render this page per request instead (product data itself is still cached).
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/shop/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { product } = await getProduct(id);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.description ?? `${product.name} from New Legacy Barbershop. Order on WhatsApp.`,
  };
}

export default function ProductPage({ params }: PageProps<"/shop/[id]">) {
  return (
    <section className="bg-offwhite py-8 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/shop"
          className="inline-flex items-center gap-1 text-sm font-medium text-charcoal/60 transition-colors hover:text-charcoal"
        >
          <ChevronLeft className="size-4" />
          Back to shop
        </Link>

        <Suspense fallback={<ProductSkeleton />}>
          <ProductDetails params={params} />
        </Suspense>
      </div>
    </section>
  );
}

async function ProductDetails({ params }: { params: PageProps<"/shop/[id]">["params"] }) {
  const { id } = await params;
  const { product, error } = await getProduct(id);

  if (error) {
    return (
      <div className="mt-8 flex items-center gap-3 rounded-2xl border border-charcoal/10 bg-white p-8 text-charcoal/70">
        <AlertCircle className="size-5 shrink-0 text-red-600" />
        {error}
      </div>
    );
  }
  if (!product) notFound();

  const images = productImages(product);
  const soldOut = product.stock_status === "out_of_stock";

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,13fr)_minmax(0,7fr)] lg:gap-10">
      <ProductGallery images={images} name={product.name} soldOut={soldOut} />

      <div className="lg:sticky lg:top-24 lg:self-start">
        <ProductInfo product={product} image={images[0] ?? null} soldOut={soldOut} />
      </div>
    </div>
  );
}

function ProductInfo({ product, image, soldOut }: { product: Product; image: string | null; soldOut: boolean }) {
  const stock = STOCK_STATUS_STYLES[product.stock_status];

  return (
    <div className="rounded-2xl border border-charcoal/10 bg-white p-6 sm:p-8">
      {product.category && (
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-charcoal/50">{product.category}</p>
      )}
      <h1 className="mt-2 font-display text-5xl leading-[0.95] tracking-wide text-charcoal sm:text-6xl">
        {product.name}
      </h1>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-charcoal/10 pb-5">
        <p className="text-3xl font-bold tracking-tight text-charcoal">{formatRand(product.price)}</p>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${stock.badge}`}
        >
          <span className={`size-1.5 rounded-full ${stock.dot}`} />
          {STOCK_STATUS_LABELS[product.stock_status]}
        </span>
      </div>

      {product.description && (
        <p className="mt-5 whitespace-pre-line leading-relaxed text-charcoal/75">{product.description}</p>
      )}

      <div className="mt-6">
        <AddToCartButton
          product={{ id: product.id, name: product.name, price: product.price, image_url: image }}
          disabled={soldOut}
        />
      </div>

      {/* Each section below renders only when the admin filled it in. */}
      {product.highlights.length > 0 && (
        <div className="mt-8 border-t border-charcoal/10 pt-6">
          <h2 className="text-base font-bold text-charcoal">About this item</h2>
          <ul className="mt-3 space-y-2.5">
            {product.highlights.map((h, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-charcoal/75">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-gold" aria-hidden="true" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {product.specs.length > 0 && (
        <div className="mt-8 border-t border-charcoal/10 pt-6">
          <h2 className="text-base font-bold text-charcoal">Product details</h2>
          <dl className="mt-3 divide-y divide-charcoal/5 text-sm">
            {product.specs.map((s, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 py-2.5">
                <dt className="font-semibold text-charcoal">{s.label}</dt>
                <dd className="text-charcoal/75">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,13fr)_minmax(0,7fr)] lg:gap-10" aria-busy="true" aria-label="Loading">
      <div className="mx-auto aspect-square w-full max-w-2xl animate-pulse rounded-2xl bg-charcoal/5" />
      <div className="space-y-4 rounded-2xl border border-charcoal/10 bg-white p-8">
        <div className="h-4 w-24 animate-pulse rounded bg-charcoal/10" />
        <div className="h-12 w-3/4 animate-pulse rounded bg-charcoal/10" />
        <div className="h-8 w-32 animate-pulse rounded bg-charcoal/10" />
        <div className="h-20 w-full animate-pulse rounded bg-charcoal/5" />
        <div className="h-12 w-full animate-pulse rounded-full bg-charcoal/10" />
      </div>
    </div>
  );
}
