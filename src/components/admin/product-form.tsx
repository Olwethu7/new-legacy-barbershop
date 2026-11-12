"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Plus, Star, X } from "lucide-react";
import { toast } from "sonner";
import { createProduct, updateProduct } from "@/lib/actions/products";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_EXTRA_IMAGES,
  MAX_HIGHLIGHTS,
  MAX_HIGHLIGHT_LENGTH,
  MAX_IMAGE_BYTES,
  MAX_SPECS,
  MAX_SPEC_LABEL_LENGTH,
  MAX_SPEC_VALUE_LENGTH,
  MEDIA_BUCKET,
  PRODUCT_CATEGORIES,
  STOCK_STATUSES,
  STOCK_STATUS_LABELS,
  STOCK_STATUS_STYLES,
  SUGGESTED_SPEC_LABELS,
  type StockStatus,
} from "@/lib/product-options";
import type { Product } from "@/lib/products";
import { createClient } from "@/lib/supabase/client";

const fieldClass =
  "mt-2 w-full rounded-xl border border-charcoal/15 bg-white px-4 py-3 text-charcoal placeholder:text-charcoal/30 transition-colors focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/25";
const smallFieldClass =
  "w-full rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal/30 transition-colors focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/25";
const labelClass = "text-sm font-semibold text-charcoal";
const cardClass = "rounded-2xl border border-charcoal/10 bg-white p-6 shadow-sm";
const STOCK_RING: Record<StockStatus, string> = {
  in_stock: "peer-checked:ring-emerald-400",
  low_stock: "peer-checked:ring-amber-400",
  out_of_stock: "peer-checked:ring-red-400",
};

/** An image in the form: either already saved (has a URL) or picked just now (has a file). */
type ImageItem =
  | { key: string; kind: "existing"; url: string }
  | { key: string; kind: "new"; file: File; preview: string };

type SpecRow = { key: string; label: string; value: string };

const newKey = () => crypto.randomUUID();
const imageSrc = (img: ImageItem) => (img.kind === "existing" ? img.url : img.preview);

/**
 * Add/Edit product form. Pass `product` to edit it in place; leave it out to create a new one.
 */
export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const editing = !!product;
  const mainInputRef = useRef<HTMLInputElement>(null);
  const extrasInputRef = useRef<HTMLInputElement>(null);
  const previewsRef = useRef(new Set<string>());

  const [main, setMain] = useState<ImageItem | null>(() =>
    product?.image_url ? { key: newKey(), kind: "existing", url: product.image_url } : null,
  );
  const [extras, setExtras] = useState<ImageItem[]>(() =>
    (product?.image_urls ?? []).map((url) => ({ key: newKey(), kind: "existing", url })),
  );
  const [highlights, setHighlights] = useState<{ key: string; text: string }[]>(() => {
    const list = product?.highlights.length ? product.highlights : [""];
    return list.map((text) => ({ key: newKey(), text }));
  });
  const [specs, setSpecs] = useState<SpecRow[]>(() =>
    product
      ? product.specs.map((s) => ({ key: newKey(), ...s }))
      : SUGGESTED_SPEC_LABELS.map((label) => ({ key: newKey(), label, value: "" })),
  );
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "saving">("idle");

  // Free every local preview when the form unmounts.
  useEffect(() => {
    const previews = previewsRef.current;
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function toNewImage(file: File | null | undefined): ImageItem | null {
    if (!file) return null;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Please choose a JPG, PNG, WebP, AVIF or GIF image.");
      return null;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(`“${file.name}” is too large. Maximum size is 5 MB.`);
      return null;
    }
    const preview = URL.createObjectURL(file);
    previewsRef.current.add(preview);
    return { key: newKey(), kind: "new", file, preview };
  }

  function release(img: ImageItem | null) {
    if (img?.kind === "new") {
      URL.revokeObjectURL(img.preview);
      previewsRef.current.delete(img.preview);
    }
  }

  function pickMain(file: File | null | undefined) {
    const next = toNewImage(file);
    if (!next) return;
    release(main);
    setMain(next);
  }

  function clearMain() {
    release(main);
    setMain(null);
    if (mainInputRef.current) mainInputRef.current.value = "";
  }

  function addExtras(files: FileList | null | undefined) {
    if (!files?.length) return;
    const room = MAX_EXTRA_IMAGES - extras.length;
    if (room <= 0) {
      toast.error(`You can add up to ${MAX_EXTRA_IMAGES} extra images.`);
      return;
    }
    const picked = Array.from(files).slice(0, room).map(toNewImage).filter((i): i is ImageItem => !!i);
    if (files.length > room) toast.error(`Only ${room} more image${room === 1 ? "" : "s"} can be added.`);
    setExtras((list) => [...list, ...picked]);
    if (extrasInputRef.current) extrasInputRef.current.value = "";
  }

  function removeExtra(key: string) {
    release(extras.find((i) => i.key === key) ?? null);
    setExtras((list) => list.filter((i) => i.key !== key));
  }

  /** Swaps an extra angle with the main image. */
  function makeMain(key: string) {
    const target = extras.find((i) => i.key === key);
    if (!target) return;
    setExtras((list) => {
      const rest = list.filter((i) => i.key !== key);
      return main ? [main, ...rest] : rest;
    });
    setMain(target);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const uploadedPaths: string[] = [];

    // 1. Upload any newly picked images to Supabase Storage (main + extras together).
    async function resolve(img: ImageItem): Promise<string> {
      if (img.kind === "existing") return img.url;
      const ext = img.file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `products/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, img.file, {
        cacheControl: "31536000",
        contentType: img.file.type,
        upsert: false,
      });
      if (error) throw error;
      uploadedPaths.push(path);
      return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
    }

    const cleanUp = async () => {
      if (uploadedPaths.length) await supabase.storage.from(MEDIA_BUCKET).remove(uploadedPaths);
    };

    let imageUrl: string | null = null;
    let imageUrls: (string | null)[] = [];
    const needsUpload = [main, ...extras].some((i) => i?.kind === "new");
    try {
      if (needsUpload) setStatus("uploading");
      [imageUrl, ...imageUrls] = await Promise.all([main ? resolve(main) : null, ...extras.map(resolve)]);
    } catch (err) {
      await cleanUp();
      setStatus("idle");
      const message = err instanceof Error ? err.message : String(err);
      toast.error(
        /bucket not found/i.test(message)
          ? "The 'media' storage bucket doesn't exist yet. Run supabase/storage.sql in Supabase first."
          : `Image upload failed: ${message}`,
      );
      return;
    }

    // 2. Save the product. Blank highlights and specs are dropped on the server.
    setStatus("saving");
    const input = {
      name: String(form.get("name") ?? ""),
      price: Number(form.get("price")),
      category: String(form.get("category") ?? ""),
      description: String(form.get("description") ?? ""),
      imageUrl,
      imageUrls: imageUrls.filter((u): u is string => !!u),
      highlights: highlights.map((h) => h.text),
      specs: specs.map(({ label, value }) => ({ label, value })),
      stockStatus: String(form.get("stock_status") ?? ""),
    };
    const result = product ? await updateProduct(product.id, input) : await createProduct(input);

    if (!result.ok) {
      // Don't leave orphaned images behind.
      await cleanUp();
      setStatus("idle");
      toast.error(result.error);
      return;
    }

    toast.success(editing ? "Product updated" : "Product added");
    router.push("/admin/products");
  }

  const busy = status !== "idle";

  return (
    <form onSubmit={handleSubmit} className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
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
              defaultValue={product?.name}
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
                  defaultValue={product ? product.price.toFixed(2) : undefined}
                  placeholder="0.00"
                  className={`${fieldClass} pl-9`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="category" className={labelClass}>
                Category
              </label>
              <select
                id="category"
                name="category"
                required
                defaultValue={product?.category ?? ""}
                className={fieldClass}
              >
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
              Short Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              maxLength={1000}
              defaultValue={product?.description ?? ""}
              placeholder="A sentence or two shown on the shop card and product page."
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
                    defaultChecked={s === (product?.stock_status ?? "in_stock")}
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

        {/* About this item */}
        <div className="space-y-4 rounded-2xl border border-charcoal/10 bg-white p-6 shadow-sm sm:p-8">
          <div>
            <p className={labelClass}>About this item</p>
            <p className="mt-0.5 text-xs text-charcoal/50">
              Optional bullet points for the product page. Leave empty to hide this section.
            </p>
          </div>
          <ul className="space-y-2">
            {highlights.map((h, i) => (
              <li key={h.key} className="flex items-center gap-2">
                <span className="size-1.5 shrink-0 rounded-full bg-gold" aria-hidden="true" />
                <input
                  aria-label={`Highlight ${i + 1}`}
                  value={h.text}
                  maxLength={MAX_HIGHLIGHT_LENGTH}
                  onChange={(e) =>
                    setHighlights((list) => list.map((x) => (x.key === h.key ? { ...x, text: e.target.value } : x)))
                  }
                  placeholder="e.g. Cushioned insole for all-day comfort"
                  className={smallFieldClass}
                />
                <RemoveRowButton
                  label={`Remove highlight ${i + 1}`}
                  onClick={() => setHighlights((list) => list.filter((x) => x.key !== h.key))}
                />
              </li>
            ))}
          </ul>
          {highlights.length < MAX_HIGHLIGHTS && (
            <AddRowButton onClick={() => setHighlights((list) => [...list, { key: newKey(), text: "" }])}>
              Add bullet point
            </AddRowButton>
          )}
        </div>

        {/* Specs */}
        <div className="space-y-4 rounded-2xl border border-charcoal/10 bg-white p-6 shadow-sm sm:p-8">
          <div>
            <p className={labelClass}>Product Details</p>
            <p className="mt-0.5 text-xs text-charcoal/50">
              Optional specs like Outer Material or Sole Material. Any row without a value is hidden on the website.
            </p>
          </div>
          <div className="space-y-2">
            {specs.map((s, i) => (
              <div key={s.key} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] items-center gap-2">
                <input
                  aria-label={`Spec ${i + 1} name`}
                  value={s.label}
                  maxLength={MAX_SPEC_LABEL_LENGTH}
                  onChange={(e) =>
                    setSpecs((list) => list.map((x) => (x.key === s.key ? { ...x, label: e.target.value } : x)))
                  }
                  placeholder="Detail, e.g. Fit"
                  className={`${smallFieldClass} font-medium`}
                />
                <input
                  aria-label={`${s.label || `Spec ${i + 1}`} value`}
                  value={s.value}
                  maxLength={MAX_SPEC_VALUE_LENGTH}
                  onChange={(e) =>
                    setSpecs((list) => list.map((x) => (x.key === s.key ? { ...x, value: e.target.value } : x)))
                  }
                  placeholder="Leave blank to hide"
                  className={smallFieldClass}
                />
                <RemoveRowButton
                  label={`Remove ${s.label || `spec ${i + 1}`}`}
                  onClick={() => setSpecs((list) => list.filter((x) => x.key !== s.key))}
                />
              </div>
            ))}
          </div>
          {specs.length < MAX_SPECS && (
            <AddRowButton onClick={() => setSpecs((list) => [...list, { key: newKey(), label: "", value: "" }])}>
              Add detail
            </AddRowButton>
          )}
        </div>
      </div>

      {/* Images + actions */}
      <div className="space-y-6">
        <div className={cardClass}>
          <p className={labelClass}>Main Image</p>
          <input
            ref={mainInputRef}
            id="image"
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            onChange={(e) => pickMain(e.target.files?.[0])}
            className="sr-only"
          />

          {main ? (
            <div className="relative mt-3 aspect-square overflow-hidden rounded-xl bg-offwhite">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview or already-uploaded image */}
              <img src={imageSrc(main)} alt="Main product image" className="size-full object-contain p-3" />
              <button
                type="button"
                onClick={clearMain}
                disabled={busy}
                aria-label="Remove main image"
                className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-full bg-charcoal/80 text-offwhite backdrop-blur transition-colors hover:bg-charcoal"
              >
                <X className="size-4" />
              </button>
              <label
                htmlFor="image"
                className="absolute bottom-3 left-3 cursor-pointer rounded-full bg-charcoal/80 px-3.5 py-1.5 text-xs font-semibold text-offwhite backdrop-blur transition-colors hover:bg-charcoal"
              >
                Replace
              </label>
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
                pickMain(e.dataTransfer.files?.[0]);
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

        <div className={cardClass}>
          <div className="flex items-baseline justify-between gap-3">
            <p className={labelClass}>Additional Angles</p>
            <span className="text-xs text-charcoal/50">
              {extras.length}/{MAX_EXTRA_IMAGES}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-charcoal/50">Optional. Shown as thumbnails on the product page.</p>
          <input
            ref={extrasInputRef}
            id="extra-images"
            type="file"
            multiple
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            onChange={(e) => addExtras(e.target.files)}
            className="sr-only"
          />
          <div className="mt-3 grid grid-cols-3 gap-2">
            {extras.map((img, i) => (
              <div key={img.key} className="group relative aspect-square overflow-hidden rounded-lg bg-offwhite">
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview or already-uploaded image */}
                <img src={imageSrc(img)} alt={`Angle ${i + 1}`} className="size-full object-contain p-1" />
                <div className="absolute inset-x-1 top-1 flex justify-between opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => makeMain(img.key)}
                    disabled={busy}
                    aria-label={`Make angle ${i + 1} the main image`}
                    title="Make main image"
                    className="inline-flex size-7 items-center justify-center rounded-full bg-charcoal/80 text-gold backdrop-blur hover:bg-charcoal"
                  >
                    <Star className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeExtra(img.key)}
                    disabled={busy}
                    aria-label={`Remove angle ${i + 1}`}
                    className="inline-flex size-7 items-center justify-center rounded-full bg-charcoal/80 text-offwhite backdrop-blur hover:bg-charcoal"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {extras.length < MAX_EXTRA_IMAGES && (
              <label
                htmlFor="extra-images"
                className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-charcoal/15 text-charcoal/50 transition-colors hover:border-gold/60 hover:text-gold"
              >
                <Plus className="size-5" />
                <span className="text-[0.65rem] font-semibold uppercase tracking-wider">Add</span>
              </label>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-4 font-semibold text-charcoal shadow-[0_10px_30px_-12px_rgba(201,162,39,0.7)] transition-colors hover:bg-gold-light disabled:cursor-wait disabled:opacity-70"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {status === "uploading"
              ? "Uploading images…"
              : status === "saving"
                ? "Saving…"
                : editing
                  ? "Save Changes"
                  : "Save Product"}
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

function AddRowButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-gold transition-colors hover:bg-gold/10"
    >
      <Plus className="size-4" />
      {children}
    </button>
  );
}

function RemoveRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-charcoal/40 transition-colors hover:bg-red-50 hover:text-red-600"
    >
      <X className="size-4" />
    </button>
  );
}
