import { cacheLife, cacheTag } from "next/cache";
import {
  cleanSpecs,
  cleanStringList,
  isStockStatus,
  type ProductSpec,
  type StockStatus,
} from "@/lib/product-options";
import { createPublicClient } from "@/lib/supabase/public";

export type Product = {
  id: string;
  name: string;
  price: number;
  category: string | null;
  /** Short description, shown on the shop card and the product page. */
  description: string | null;
  /** Main photo. */
  image_url: string | null;
  /** Extra angles, in display order. Always an array, possibly empty. */
  image_urls: string[];
  /** "About this item" bullets. Empty when the admin didn't add any. */
  highlights: string[];
  /** Only specs with both a label and a value. */
  specs: ProductSpec[];
  stock_status: StockStatus;
  featured: boolean;
};

export type ProductsResult = { products: Product[]; error: string | null };

export const PRODUCT_COLUMNS =
  "id, name, price, category, description, image_url, image_urls, highlights, specs, stock_status, featured";

/** Columns that exist before migration 003. Used as a fallback so the shop keeps working until it's run. */
const LEGACY_COLUMNS = "id, name, price, category, description, image_url, stock_status, featured";
const isMissingNewColumns = (message: string) => /column .*(image_urls|highlights|specs)/i.test(message);

/** Turns a raw database row into a Product, dropping blank or malformed extras. */
export function toProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    price: Number(row.price),
    category: typeof row.category === "string" ? row.category : null,
    description: typeof row.description === "string" && row.description.trim() ? row.description : null,
    image_url: typeof row.image_url === "string" && row.image_url ? row.image_url : null,
    image_urls: cleanStringList(row.image_urls),
    highlights: cleanStringList(row.highlights),
    specs: cleanSpecs(row.specs),
    stock_status: isStockStatus(row.stock_status) ? row.stock_status : "in_stock",
    featured: row.featured === true,
  };
}

/** Main photo first, then the extra angles, with duplicates removed. */
export function productImages(product: Pick<Product, "image_url" | "image_urls">): string[] {
  const all = product.image_url ? [product.image_url, ...product.image_urls] : product.image_urls;
  return [...new Set(all)];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isProductId(value: string) {
  return UUID_RE.test(value);
}

/**
 * Loads all products, featured first. Cached for a few minutes;
 * call `updateTag("products")` after admin edits to refresh instantly.
 */
export async function getProducts(): Promise<ProductsResult> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");

  const supabase = createPublicClient();
  const list = (columns: string) =>
    supabase
      .from("products")
      .select(columns)
      .order("featured", { ascending: false })
      .order("name", { ascending: true })
      .overrideTypes<Record<string, unknown>[], { merge: false }>();

  let { data, error } = await list(PRODUCT_COLUMNS);
  if (error && isMissingNewColumns(error.message)) {
    console.warn("products: run supabase/migrations/003_product_gallery_and_details.sql to enable extra images and details.");
    ({ data, error } = await list(LEGACY_COLUMNS));
  }

  if (error) {
    console.error("Failed to load products:", error.message);
    return { products: [], error: "We couldn't load the shop right now. Please try again shortly." };
  }

  return { products: (data ?? []).map(toProduct), error: null };
}

export type ProductResult = { product: Product | null; error: string | null };

/** Loads one product for its details page. `product` is null when it doesn't exist. */
export async function getProduct(id: string): Promise<ProductResult> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");

  if (!isProductId(id)) return { product: null, error: null };

  const supabase = createPublicClient();
  const one = (columns: string) =>
    supabase.from("products").select(columns).eq("id", id).maybeSingle<Record<string, unknown>>();

  let { data, error } = await one(PRODUCT_COLUMNS);
  if (error && isMissingNewColumns(error.message)) ({ data, error } = await one(LEGACY_COLUMNS));

  if (error) {
    console.error("Failed to load product:", error.message);
    return { product: null, error: "We couldn't load this product right now. Please try again shortly." };
  }

  return { product: data ? toProduct(data) : null, error: null };
}
