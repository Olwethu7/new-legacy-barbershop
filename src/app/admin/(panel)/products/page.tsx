import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import * as m from "framer-motion/client";
import { AlertCircle, ImageOff, Package, Plus } from "lucide-react";
import { FadeIn } from "@/components/admin/admin-motion";
import { DeleteProductButton } from "@/components/admin/delete-product-button";
import { canOptimizeImage } from "@/lib/images";
import { EASE_LUXE } from "@/lib/motion";
import { STOCK_STATUS_LABELS, STOCK_STATUS_STYLES, isStockStatus } from "@/lib/product-options";
import { formatRand } from "@/lib/services";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Products" };

export default async function AdminProductsPage() {
  const supabase = await createClient();
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, price, category, image_url, stock_status")
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 sm:p-10">
      <FadeIn className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Shop</p>
          <h1 className="mt-2 font-display text-5xl tracking-wide text-charcoal sm:text-6xl">Products</h1>
          <p className="mt-1 text-charcoal/60">
            {products ? `${products.length} ${products.length === 1 ? "product" : "products"} in your shop` : " "}
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 font-semibold text-charcoal shadow-[0_10px_30px_-12px_rgba(201,162,39,0.7)] transition-all hover:-translate-y-0.5 hover:bg-gold-light"
        >
          <Plus className="size-4" />
          Add Product
        </Link>
      </FadeIn>

      <FadeIn delay={0.12} className="mt-8 rounded-2xl border border-charcoal/10 bg-white shadow-sm">
        {error ? (
          <div className="flex items-center gap-3 p-8 text-red-700">
            <AlertCircle className="size-5 shrink-0" />
            {/column .*stock_status/i.test(error.message)
              ? "The database still uses the old in_stock column. Run supabase/migrations/002_stock_status_and_gallery.sql in Supabase."
              : "Couldn't load products. Please refresh the page."}
          </div>
        ) : !products || products.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-charcoal text-gold">
              <Package className="size-7" strokeWidth={1.5} />
            </div>
            <h2 className="mt-5 font-display text-3xl tracking-wide text-charcoal">No products yet</h2>
            <p className="mt-1 text-sm text-charcoal/60">Add your first product and it will appear in the shop.</p>
            <Link
              href="/admin/products/new"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-charcoal px-6 py-3 text-sm font-semibold text-offwhite transition-colors hover:bg-charcoal-soft"
            >
              <Plus className="size-4" />
              Add Product
            </Link>
          </div>
        ) : (
          // Horizontal padding gives the hover-scaled rows room so they aren't clipped.
          <div className="overflow-x-auto px-2 pb-2">
            <table className="w-full min-w-[680px] border-separate border-spacing-y-1 text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.15em] text-charcoal/50">
                <tr>
                  <th scope="col" className="px-5 pb-3 pt-5 font-semibold">Image</th>
                  <th scope="col" className="px-5 pb-3 pt-5 font-semibold">Name</th>
                  <th scope="col" className="px-5 pb-3 pt-5 font-semibold">Price</th>
                  <th scope="col" className="px-5 pb-3 pt-5 font-semibold">Category</th>
                  <th scope="col" className="px-5 pb-3 pt-5 font-semibold">Stock</th>
                  <th scope="col" className="px-5 pb-3 pt-5 text-right font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, i) => {
                  const stock = isStockStatus(product.stock_status) ? product.stock_status : "in_stock";
                  return (
                    <m.tr
                      key={product.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 + Math.min(i, 15) * 0.04, ease: EASE_LUXE }}
                      className="group [&>td]:bg-white [&>td]:transition-colors [&>td:first-child]:rounded-l-xl [&>td:last-child]:rounded-r-xl hover:relative hover:z-10 hover:scale-[1.012] hover:shadow-lg hover:shadow-charcoal/5 hover:[&>td]:bg-gold/[0.05] motion-safe:transition-[scale,box-shadow] motion-safe:duration-300"
                    >
                      <td className="px-5 py-3">
                        <div className="relative size-14 overflow-hidden rounded-xl bg-charcoal/5">
                          {product.image_url ? (
                            <Image
                              src={product.image_url}
                              alt={product.name}
                              fill
                              sizes="56px"
                              unoptimized={!canOptimizeImage(product.image_url)}
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-charcoal/25">
                              <ImageOff className="size-5" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 font-medium text-charcoal">{product.name}</td>
                      <td className="px-5 py-3 font-display text-xl tracking-wide text-charcoal">
                        {formatRand(Number(product.price))}
                      </td>
                      <td className="px-5 py-3 text-charcoal/70">{product.category ?? "—"}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${STOCK_STATUS_STYLES[stock].badge}`}
                        >
                          <span className={`size-1.5 rounded-full ${STOCK_STATUS_STYLES[stock].dot}`} />
                          {STOCK_STATUS_LABELS[stock]}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <DeleteProductButton id={product.id} name={product.name} />
                      </td>
                    </m.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </FadeIn>
    </div>
  );
}
