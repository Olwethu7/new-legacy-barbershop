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

/** Limits for the extra product fields (checked in the form and again on the server). */
export const MAX_EXTRA_IMAGES = 8;
export const MAX_HIGHLIGHTS = 10;
export const MAX_HIGHLIGHT_LENGTH = 300;
export const MAX_SPECS = 20;
export const MAX_SPEC_LABEL_LENGTH = 40;
export const MAX_SPEC_VALUE_LENGTH = 200;

/** Spec rows offered on a new product. Rows left blank are simply not saved or shown. */
export const SUGGESTED_SPEC_LABELS = ["Outer Material", "Sole Material", "Closure Type", "Size", "Colour"];

export type ProductSpec = { label: string; value: string };

/** Keeps only non-empty strings, trimmed. Anything else from the database is ignored. */
export function cleanStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean);
}

/** Keeps only specs where both the label and the value were filled in. */
export function cleanSpecs(value: unknown): ProductSpec[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    const label = typeof row?.label === "string" ? row.label.trim() : "";
    const val = typeof row?.value === "string" ? row.value.trim() : "";
    return label && val ? [{ label, value: val }] : [];
  });
}

/** Turns a public Storage URL back into the file path inside the media bucket, or null if it isn't one. */
export function mediaPathFromUrl(url: string | null | undefined) {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length));
}
