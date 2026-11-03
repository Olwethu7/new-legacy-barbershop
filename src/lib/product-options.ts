export const PRODUCT_CATEGORIES = [
  "Hair",
  "Beard",
  "Shave",
  "Apparel",
  "Hair Clippers",
  "Face Products",
  "Other",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const STOCK_STATUSES = ["in_stock", "low_stock", "out_of_stock"] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
};

/** Badge colours: green / yellow / red. */
export const STOCK_STATUS_STYLES: Record<StockStatus, { badge: string; dot: string }> = {
  in_stock: { badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  low_stock: { badge: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-400" },
  out_of_stock: { badge: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-500" },
};

export function isStockStatus(value: unknown): value is StockStatus {
  return typeof value === "string" && (STOCK_STATUSES as readonly string[]).includes(value);
}

/** Supabase Storage bucket for uploaded images (see supabase/storage.sql). */
export const MEDIA_BUCKET = "media";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

/** Turns a public Storage URL back into the file path inside the media bucket, or null if it isn't one. */
export function mediaPathFromUrl(url: string | null | undefined) {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length));
}
