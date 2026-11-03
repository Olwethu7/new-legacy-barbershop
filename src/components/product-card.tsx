import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { canOptimizeImage } from "@/lib/images";
import type { Product } from "@/lib/products";
import { formatRand } from "@/lib/services";

export function ProductCard({ product }: { product: Product }) {
  const soldOut = product.stock_status === "out_of_stock";
  const lowStock = product.stock_status === "low_stock";

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gold hover:shadow-xl hover:shadow-gold/10">
      <div className="relative aspect-square overflow-hidden bg-charcoal">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            unoptimized={!canOptimizeImage(product.image_url)}
            className={`object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${
              soldOut ? "opacity-50 grayscale" : ""
            }`}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(201,162,39,0.18),transparent_70%)]">
            <ShoppingBag className="size-14 text-gold/60" strokeWidth={1.25} />
          </div>
        )}

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {product.featured && (
            <span className="rounded-full bg-gold px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-charcoal">
              Featured
            </span>
          )}
          {soldOut && (
            <span className="rounded-full bg-charcoal/90 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-offwhite">
              Sold Out
            </span>
          )}
          {lowStock && (
            <span className="rounded-full bg-amber-400 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-charcoal">
              Only a few left
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        {product.category && (
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">{product.category}</p>
        )}
        <div className="mt-1 flex items-start justify-between gap-4">
          <h3 className="font-display text-2xl leading-tight tracking-wide text-charcoal">{product.name}</h3>
          <span className="font-display text-3xl leading-none text-gold">{formatRand(product.price)}</span>
        </div>
        {product.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-charcoal/60">{product.description}</p>
        )}
        <div className="mt-auto pt-6">
          <AddToCartButton
            product={{ id: product.id, name: product.name, price: product.price, image_url: product.image_url }}
            disabled={soldOut}
          />
        </div>
      </div>
    </article>
  );
}
