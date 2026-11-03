"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, useTransition } from "react";
import { ImagePlus, Images, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { addGalleryImage, deleteGalleryImage } from "@/lib/actions/gallery";
import { EASE_LUXE } from "@/lib/motion";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, MEDIA_BUCKET } from "@/lib/product-options";
import { createClient } from "@/lib/supabase/client";

export type AdminGalleryImage = {
  id: string;
  url: string;
  caption: string | null;
  width: number | null;
  height: number | null;
};

/** Reads an image file's pixel size in the browser so the public grid can reserve space for it. */
function readImageSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export function GalleryManager({ images }: { images: AdminGalleryImage[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);

  async function uploadFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (inputRef.current) inputRef.current.value = "";
    if (files.length === 0) return;

    const valid = files.filter((f) => {
      if (!ALLOWED_IMAGE_TYPES.includes(f.type)) {
        toast.error(`${f.name}: please use JPG, PNG, WebP, AVIF or GIF.`);
        return false;
      }
      if (f.size > MAX_IMAGE_BYTES) {
        toast.error(`${f.name}: too large (max 5 MB).`);
        return false;
      }
      return true;
    });
    if (valid.length === 0) return;

    const supabase = createClient();
    let succeeded = 0;
    setUploading({ done: 0, total: valid.length });

    for (const file of valid) {
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `gallery/${crypto.randomUUID()}.${ext}`;
      const size = await readImageSize(file);

      const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
        cacheControl: "31536000",
        contentType: file.type,
        upsert: false,
      });

      if (uploadError) {
        toast.error(`${file.name}: upload failed (${uploadError.message}).`);
      } else {
        const url = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
        const result = await addGalleryImage({ imageUrl: url, width: size?.width, height: size?.height });
        if (result.ok) {
          succeeded++;
        } else {
          await supabase.storage.from(MEDIA_BUCKET).remove([path]);
          toast.error(`${file.name}: ${result.error}`);
        }
      }
      setUploading((u) => (u ? { ...u, done: u.done + 1 } : u));
    }

    setUploading(null);
    if (succeeded > 0) toast.success(succeeded === 1 ? "Image uploaded" : `${succeeded} images uploaded`);
  }

  const busy = uploading !== null;

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-charcoal/60">
          {images.length} {images.length === 1 ? "image" : "images"}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          multiple
          onChange={(e) => uploadFiles(e.target.files)}
          className="sr-only"
          id="gallery-upload"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 font-semibold text-charcoal shadow-[0_10px_30px_-12px_rgba(201,162,39,0.7)] transition-colors hover:bg-gold-light disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {busy ? `Uploading ${uploading.done + 1} of ${uploading.total}…` : "Upload Image"}
        </button>
      </div>

      {images.length === 0 && !busy ? (
        <motion.button
          type="button"
          onClick={() => inputRef.current?.click()}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: EASE_LUXE }}
          className="mt-6 flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-charcoal/15 bg-white px-6 py-16 text-center transition-colors hover:border-gold/60 hover:bg-gold/[0.03]"
        >
          <div className="flex size-16 items-center justify-center rounded-full bg-charcoal text-gold">
            <Images className="size-7" strokeWidth={1.5} />
          </div>
          <span className="mt-5 font-display text-3xl tracking-wide text-charcoal">No uploaded photos yet</span>
          <span className="mt-1 text-sm text-charcoal/60">Click to upload your first photos (you can pick several at once).</span>
        </motion.button>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {busy &&
            Array.from({ length: uploading.total - uploading.done }).map((_, i) => (
              <li
                key={`uploading-${i}`}
                className="flex aspect-square animate-pulse items-center justify-center rounded-2xl bg-charcoal/5 text-charcoal/30"
              >
                <ImagePlus className="size-7" />
              </li>
            ))}
          <AnimatePresence initial={true}>
            {images.map((image, i) => (
              <GalleryTile key={image.id} image={image} index={i} />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </>
  );
}

function GalleryTile({ image, index }: { image: AdminGalleryImage; index: number }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(t);
  }, [confirming]);

  function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const result = await deleteGalleryImage(image.id);
      if (result.ok) toast.success("Image deleted");
      else {
        setConfirming(false);
        toast.error(result.error);
      }
    });
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.5, delay: Math.min(index, 12) * 0.04, ease: EASE_LUXE }}
      className="group relative aspect-square overflow-hidden rounded-2xl bg-charcoal shadow-sm ring-1 ring-charcoal/10"
    >
      <Image
        src={image.url}
        alt={image.caption ?? "Gallery photo"}
        fill
        sizes="(min-width: 1280px) 25vw, (min-width: 640px) 33vw, 50vw"
        className={`object-cover transition-all duration-700 ease-out group-hover:scale-105 ${pending ? "opacity-40" : ""}`}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-charcoal/70 via-transparent to-transparent opacity-100 transition-opacity duration-300 lg:opacity-0 lg:group-hover:opacity-100" />
      <span className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-inset ring-transparent transition-colors duration-300 group-hover:ring-gold/70" />

      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        aria-label={confirming ? "Confirm delete image" : "Delete image"}
        className={`absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold shadow-lg backdrop-blur transition-all focus-visible:opacity-100 ${
          confirming
            ? "bg-red-600 text-white opacity-100"
            : "bg-white/90 text-red-600 opacity-100 hover:bg-white lg:opacity-0 lg:group-hover:opacity-100"
        }`}
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
        {pending ? "Deleting…" : confirming ? "Confirm" : "Delete"}
      </button>
    </motion.li>
  );
}
