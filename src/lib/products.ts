import { cacheLife, cacheTag } from "next/cache";
import { isStockStatus, type StockStatus } from "@/lib/product-options";
import { createPublicClient } from "@/lib/supabase/public";

export type Product = {
  id: string;
  name: string;
  price: number;
  category: string | null;
  description: string | null;
  image_url: string | null;
  stock_status: StockStatus;
  featured: boolean;
};

export type ProductsResult = { products: Product[]; error: string | null };

/**
 * Loads all products, featured first. Cached for a few minutes;
 * call `revalidateTag("products")` after admin edits to refresh instantly.
 */
export async function getProducts(): Promise<ProductsResult> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, price, category, description, image_url, stock_status, featured")
    .order("featured", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to load products:", error.message);
    return { products: [], error: "We couldn't load the shop right now. Please try again shortly." };
  }

  return {
    products: (data ?? []).map((p) => ({
      ...p,
      price: Number(p.price),
      stock_status: isStockStatus(p.stock_status) ? p.stock_status : "in_stock",
    })),
    error: null,
  };
}
