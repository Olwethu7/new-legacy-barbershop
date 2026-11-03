import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/admin/product-form";

export const metadata: Metadata = { title: "Add Product" };

export default function NewProductPage() {
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
        <h1 className="mt-2 font-display text-5xl tracking-wide text-charcoal sm:text-6xl">Add Product</h1>
        <p className="mt-1 text-charcoal/60">New products appear in the public shop straight away.</p>
      </header>

      <ProductForm />
    </div>
  );
}
