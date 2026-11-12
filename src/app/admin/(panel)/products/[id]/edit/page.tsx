import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/admin/product-form";
import { PRODUCT_COLUMNS, isProductId, toProduct } from "@/lib/products";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit Product" };

// The admin sidebar reads usePathname(), which isn't known for a product ID at build time.
export const instant = false;

export default function EditProductPage({ params }: PageProps<"/admin/products/[id]/edit">) {
  return (
    <div className="p-6 sm:p-10">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-2 text-sm font-medium text-charcoal/50 transition-colors hover:text-gold"
      >
        <ArrowLeft className="size-4" />
        Back to products
      </Link>

      <header className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Shop</p>
        <h1 className="mt-2 font-display text-5xl tracking-wide text-charcoal sm:text-6xl">Edit Product</h1>
        <p className="mt-1 text-charcoal/60">Changes appear in the public shop as soon as you save.</p>
      </header>

      <Suspense fallback={<FormSkeleton />}>
        <EditForm params={params} />
      </Suspense>
    </div>
  );
}

async function EditForm({ params }: { params: PageProps<"/admin/products/[id]/edit">["params"] }) {
  const { id } = await params;
  if (!isProductId(id)) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select(PRODUCT_COLUMNS).eq("id", id).maybeSingle();

  if (error) {
    return (
      <div className="mt-8 flex items-center gap-3 rounded-2xl border border-charcoal/10 bg-white p-8 text-red-700 shadow-sm">
        <AlertCircle className="size-5 shrink-0" />
        {/column .*(image_urls|highlights|specs)/i.test(error.message)
          ? "The database is missing the new product columns. Run supabase/migrations/003_product_gallery_and_details.sql in Supabase."
          : "Couldn't load this product. Please refresh the page."}
      </div>
    );
  }
  if (!data) notFound();

  return <ProductForm product={toProduct(data)} />;
}

function FormSkeleton() {
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]" aria-busy="true" aria-label="Loading">
      <div className="h-[28rem] animate-pulse rounded-2xl bg-charcoal/5" />
      <div className="aspect-square animate-pulse rounded-2xl bg-charcoal/5" />
    </div>
  );
}
