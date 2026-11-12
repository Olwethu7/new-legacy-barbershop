"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  MAX_EXTRA_IMAGES,
  MAX_HIGHLIGHTS,
  MAX_HIGHLIGHT_LENGTH,
  MAX_SPECS,
  MAX_SPEC_LABEL_LENGTH,
  MAX_SPEC_VALUE_LENGTH,
  MEDIA_BUCKET,
  PRODUCT_CATEGORIES,
  cleanSpecs,
  cleanStringList,
  isStockStatus,
  mediaPathFromUrl,
} from "@/lib/product-options";
import { isProductId } from "@/lib/products";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type ProductInput = {
  name: string;
  price: number;
  category: string;
  description: string;
  imageUrl: string | null;
  /** Extra angles, in display order. */
  imageUrls: string[];
  highlights: string[];
  specs: { label: string; value: string }[];
  stockStatus: string;
};

type ProductRow = {
  name: string;
  price: number;
  category: string;
  description: string | null;
  image_url: string | null;
  image_urls: string[];
  highlights: string[];
  specs: { label: string; value: string }[];
  stock_status: string;
};

/** Refresh the public shop, product pages and the admin list after a change. */
function refreshProducts() {
  updateTag("products");
  revalidatePath("/admin/products");
}

/** Validates form input and turns it into a database row. Blank extras are dropped here. */
function parseInput(input: ProductInput): { ok: true; row: ProductRow } | { ok: false; error: string } {
  const name = String(input?.name ?? "").trim();
  const description = String(input?.description ?? "").trim();
  const price = Math.round(Number(input?.price) * 100) / 100;
  const category = String(input?.category ?? "");
  const imageUrl = input?.imageUrl ? String(input.imageUrl) : null;
  const imageUrls = [...new Set(cleanStringList(input?.imageUrls))].filter((u) => u !== imageUrl);
  const highlights = cleanStringList(input?.highlights);
  const specs = cleanSpecs(input?.specs);
  const stockStatus = input?.stockStatus;

  if (name.length < 2 || name.length > 120) return { ok: false, error: "Name must be 2–120 characters." };
  if (!Number.isFinite(price) || price < 0 || price > 100000) return { ok: false, error: "Enter a valid price." };
  if (!PRODUCT_CATEGORIES.includes(category as (typeof PRODUCT_CATEGORIES)[number])) {
    return { ok: false, error: "Choose a category." };
  }
  if (description.length > 1000) return { ok: false, error: "Description is too long (max 1000 characters)." };
  if (!isStockStatus(stockStatus)) return { ok: false, error: "Choose a stock status." };

  if (imageUrl && !mediaPathFromUrl(imageUrl)) return { ok: false, error: "Image must be uploaded to the media bucket." };
  if (imageUrls.length > MAX_EXTRA_IMAGES) return { ok: false, error: `Add at most ${MAX_EXTRA_IMAGES} extra images.` };
  if (imageUrls.some((u) => !mediaPathFromUrl(u))) {
    return { ok: false, error: "Images must be uploaded to the media bucket." };
  }

  if (highlights.length > MAX_HIGHLIGHTS) return { ok: false, error: `Add at most ${MAX_HIGHLIGHTS} highlights.` };
  if (highlights.some((h) => h.length > MAX_HIGHLIGHT_LENGTH)) {
    return { ok: false, error: `Each highlight must be under ${MAX_HIGHLIGHT_LENGTH} characters.` };
  }
  if (specs.length > MAX_SPECS) return { ok: false, error: `Add at most ${MAX_SPECS} specs.` };
  if (specs.some((s) => s.label.length > MAX_SPEC_LABEL_LENGTH || s.value.length > MAX_SPEC_VALUE_LENGTH)) {
    return { ok: false, error: "A spec label or value is too long." };
  }

  return {
    ok: true,
    row: {
      name,
      price,
      category,
      description: description || null,
      image_url: imageUrl,
      image_urls: imageUrls,
      highlights,
      specs,
      stock_status: stockStatus,
    },
  };
}

/** Removes images from Storage. A failure here is logged but never undoes the database change. */
async function removeImages(supabase: Awaited<ReturnType<typeof createClient>>, urls: (string | null)[], where: string) {
  const paths = urls.map(mediaPathFromUrl).filter((p): p is string => !!p);
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove(paths);
  if (error) console.warn(`${where}: images not removed:`, error.message);
}

function saveErrorMessage(message: string) {
  return /column .*(image_urls|highlights|specs)/i.test(message)
    ? "The database is missing the new product columns. Run supabase/migrations/003_product_gallery_and_details.sql in Supabase."
    : "Couldn't save the product. Please try again.";
}

export async function createProduct(input: ProductInput): Promise<ActionResult> {
  await requireAdmin();

  const parsed = parseInput(input);
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert(parsed.row);

  if (error) {
    console.error("createProduct:", error.message);
    return { ok: false, error: saveErrorMessage(error.message) };
  }

  refreshProducts();
  return { ok: true };
}

/** Updates an existing product in place (same ID), then cleans up any images it no longer uses. */
export async function updateProduct(id: string, input: ProductInput): Promise<ActionResult> {
  await requireAdmin();
  if (!isProductId(String(id))) return { ok: false, error: "That product no longer exists." };

  const parsed = parseInput(input);
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const { data: before, error: readError } = await supabase
    .from("products")
    .select("image_url, image_urls")
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    console.error("updateProduct (read):", readError.message);
    return { ok: false, error: saveErrorMessage(readError.message) };
  }
  if (!before) return { ok: false, error: "That product no longer exists." };

  const { data, error } = await supabase.from("products").update(parsed.row).eq("id", id).select("id");

  if (error) {
    console.error("updateProduct:", error.message);
    return { ok: false, error: saveErrorMessage(error.message) };
  }
  if (!data || data.length === 0) return { ok: false, error: "That product no longer exists." };

  // Delete only images that belonged to this product and were removed or replaced in the form.
  const keep = new Set([parsed.row.image_url, ...parsed.row.image_urls]);
  const previous = [before.image_url, ...cleanStringList(before.image_urls)];
  await removeImages(
    supabase,
    previous.filter((url) => url && !keep.has(url)),
    "updateProduct",
  );

  refreshProducts();
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase.from("products").delete().eq("id", id).select("*"); // "*" so this still works before migration 003

  if (error) {
    console.error("deleteProduct:", error.message);
    return { ok: false, error: "Couldn't delete the product. Please try again." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "That product no longer exists." };
  }

  // Clean up the uploaded images too.
  await removeImages(supabase, [data[0].image_url, ...cleanStringList(data[0].image_urls)], "deleteProduct");

  refreshProducts();
  return { ok: true };
}
