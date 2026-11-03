"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createProduct } from "@/lib/actions/products";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MEDIA_BUCKET,
  PRODUCT_CATEGORIES,
  STOCK_STATUSES,
  STOCK_STATUS_LABELS,
  STOCK_STATUS_STYLES,
  type StockStatus,
} from "@/lib/product-options";
import { createClient } from "@/lib/supabase/client";

const fieldClass =
  "mt-2 w-full rounded-xl border border-charcoal/15 bg-white px-4 py-3 text-charcoal placeholder:text-charcoal/30 transition-colors focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/25";
const labelClass = "text-sm font-semibold text-charcoal";
const STOCK_RING: Record<StockStatus, string> = {
  in_stock: "peer-checked:ring-emerald-400",
  low_stock: "peer-checked:ring-amber-400",
  out_of_stock: "peer-checked:ring-red-400",
};

export function ProductForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "saving">("idle");

  // Free the preview's memory when it changes or the form unmounts.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function pickFile(next: File | null | undefined) {
    if (!next) return;
    if (!ALLOWED_IMAGE_TYPES.includes(next.type)) {
      toast.error("Please choose a JPG, PNG, WebP, AVIF or GIF image.");
      return;
    }
    if (next.size > MAX_IMAGE_BYTES) {
      toast.error("Image is too large. Maximum size is 5 MB.");
      return;
    }
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  function clearFile() {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    let imageUrl: string | null = null;
    let uploadedPath: string | null = null;

    // 1. Upload the image to Supabase Storage.
    if (file) {
      setStatus("uploading");
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      uploadedPath = `products/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(uploadedPath, file, {
        cacheControl: "31536000",
        contentType: file.type,
        upsert: false,
      });

      if (error) {
        setStatus("idle");
        toast.error(
          /bucket not found/i.test(error.message)
            ? "The 'media' storage bucket doesn't exist yet. Run supabase/storage.sql in Supabase first."
            : `Image upload failed: ${error.message}`,
        );
        return;
      }
      imageUrl = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(uploadedPath).data.publicUrl;
    }

    // 2. Save the product.
    setStatus("saving");
    const result = await createProduct({
      name: String(form.get("name") ?? ""),
      price: Number(form.get("price")),
      category: String(form.get("category") ?? ""),
      description: String(form.get("description") ?? ""),
      imageUrl,
      stockStatus: String(form.get("stock_status") ?? ""),
    });

    if (!result.ok) {
      // Don't leave an orphaned image behind.
      if (uploadedPath) await supabase.storage.from(MEDIA_BUCKET).remove([uploadedPath]);
      setStatus("idle");
      toast.error(result.error);
      return;
    }

    toast.success("Product added");
    router.push("/admin/products");
  }

  const busy = status !== "idle";

  return (
    <form onSubmit={handleSubmit} className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]">
      {/* Details */}
      <div className="space-y-6 rounded-2xl border border-charcoal/10 bg-white p-6 shadow-sm sm:p-8">
        <div>
          <label htmlFor="name" className={labelClass}>
            Name
          </label>
          <input
            id="name"
            name="name"
            required
            minLength={2}
            maxLength={120}
            placeholder="e.g. Beard Oil – Sandalwood"
            className={fieldClass}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="price" className={labelClass}>
              Price (R)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 mt-1 -translate-y-1/2 font-semibold text-charcoal/40">
                R
              </span>
              <input
                id="price"
                name="price"
                type="number"
                required
                min={0}
                max={100000}
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                className={`${fieldClass} pl-9`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="category" className={labelClass}>
              Category
            </label>
            <select id="category" name="category" required defaultValue="" className={fieldClass}>
              <option value="" disabled>
                Choose a category
              </option>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="description" className={labelClass}>
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={5}
            maxLength={1000}
            placeholder="What it is, how to use it, size…"
            className={`${fieldClass} resize-y`}
          />
        </div>

        <fieldset>
          <legend className={labelClass}>Stock Status</legend>
          <p className="mt-0.5 text-xs text-charcoal/50">
            Out-of-stock products stay visible in the shop but can&apos;t be added to the cart.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {STOCK_STATUSES.map((s) => (
              <label key={s} className="cursor-pointer">
                <input
                  type="radio"
                  name="stock_status"
                  value={s}
                  defaultChecked={s === "in_stock"}
                  required
                  className="peer sr-only"
                />
                <span
                  className={`flex items-center gap-2.5 rounded-xl border border-charcoal/10 bg-offwhite px-4 py-3 text-sm font-medium text-charcoal/70 transition-all peer-checked:bg-white peer-checked:text-charcoal peer-checked:shadow-sm peer-checked:ring-2 peer-focus-visible:ring-2 peer-focus-visible:ring-gold/40 ${STOCK_RING[s]}`}
                >
                  <span className={`size-2.5 rounded-full ${STOCK_STATUS_STYLES[s].dot}`} />
                  {STOCK_STATUS_LABELS[s]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Image + actions */}
      <div className="space-y-6">
        <div className="rounded-2xl border border-charcoal/10 bg-white p-6 shadow-sm">
          <p className={labelClass}>Image</p>
          <input
            ref={fileInputRef}
            id="image"
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            onChange={(e) => pickFile(e.target.files?.[0])}
            className="sr-only"
          />

          {preview ? (
            <div className="relative mt-3 aspect-square overflow-hidden rounded-xl bg-charcoal/5">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
              <img src={preview} alt="Selected product image" className="size-full object-cover" />
              <button
                type="button"
                onClick={clearFile}
                disabled={busy}
                aria-label="Remove image"
                className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-full bg-charcoal/80 text-offwhite backdrop-blur transition-colors hover:bg-charcoal"
              >
                <X className="size-4" />
              </button>
              <p className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-charcoal/80 to-transparent px-4 pb-3 pt-8 text-xs text-offwhite">
                {file?.name}
              </p>
            </div>
          ) : (
            <label
              htmlFor="image"
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pickFile(e.dataTransfer.files?.[0]);
              }}
              className={`mt-3 flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 text-center transition-colors ${
                dragging ? "border-gold bg-gold/5" : "border-charcoal/15 hover:border-gold/60 hover:bg-gold/[0.03]"
              }`}
            >
              <div className="flex size-14 items-center justify-center rounded-full bg-charcoal text-gold">
                <ImagePlus className="size-6" />
              </div>
              <span className="mt-4 text-sm font-semibold text-charcoal">Click to upload or drag & drop</span>
              <span className="mt-1 text-xs text-charcoal/50">JPG, PNG, WebP · up to 5 MB</span>
            </label>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-4 font-semibold text-charcoal shadow-[0_10px_30px_-12px_rgba(201,162,39,0.7)] transition-colors hover:bg-gold-light disabled:cursor-wait disabled:opacity-70"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {status === "uploading" ? "Uploading image…" : status === "saving" ? "Saving…" : "Save Product"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/products")}
            disabled={busy}
            className="w-full rounded-full px-6 py-3 text-sm font-medium text-charcoal/60 transition-colors hover:text-charcoal disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
