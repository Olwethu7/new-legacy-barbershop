"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { MEDIA_BUCKET, PRODUCT_CATEGORIES, isStockStatus, mediaPathFromUrl } from "@/lib/product-options";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type NewProductInput = {
  name: string;
  price: number;
  category: string;
  description: string;
  imageUrl: string | null;
  stockStatus: string;
};

/** Refresh the public shop and the admin list after a change. */
function refreshProducts() {
  updateTag("products");
  revalidatePath("/admin/products");
}

export async function createProduct(input: NewProductInput): Promise<ActionResult> {
  await requireAdmin();

  const name = String(input?.name ?? "").trim();
  const description = String(input?.description ?? "").trim();
  const price = Math.round(Number(input?.price) * 100) / 100;
  const category = String(input?.category ?? "");
  const imageUrl = input?.imageUrl ? String(input.imageUrl) : null;
  const stockStatus = input?.stockStatus;
  if (!isStockStatus(stockStatus)) return { ok: false, error: "Choose a stock status." };

  if (name.length < 2 || name.length > 120) return { ok: false, error: "Name must be 2–120 characters." };
  if (!Number.isFinite(price) || price < 0 || price > 100000) return { ok: false, error: "Enter a valid price." };
  if (!PRODUCT_CATEGORIES.includes(category as (typeof PRODUCT_CATEGORIES)[number])) {
    return { ok: false, error: "Choose a category." };
  }
  if (description.length > 1000) return { ok: false, error: "Description is too long (max 1000 characters)." };
  if (imageUrl && !mediaPathFromUrl(imageUrl)) return { ok: false, error: "Image must be uploaded to the media bucket." };

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    name,
    price,
    category,
    description: description || null,
    image_url: imageUrl,
    stock_status: stockStatus,
  });

  if (error) {
    console.error("createProduct:", error.message);
    return { ok: false, error: "Couldn't save the product. Please try again." };
  }

  refreshProducts();
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase.from("products").delete().eq("id", id).select("image_url");

  if (error) {
    console.error("deleteProduct:", error.message);
    return { ok: false, error: "Couldn't delete the product. Please try again." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "That product no longer exists." };
  }

  // Clean up the uploaded image too. A failure here doesn't undo the delete.
  const imagePath = mediaPathFromUrl(data[0].image_url);
  if (imagePath) {
    const { error: storageError } = await supabase.storage.from(MEDIA_BUCKET).remove([imagePath]);
    if (storageError) console.warn("deleteProduct: image not removed:", storageError.message);
  }

  refreshProducts();
  return { ok: true };
}
