import type { Metadata } from "next";
import { AlertCircle } from "lucide-react";
import { FadeIn } from "@/components/admin/admin-motion";
import { GalleryManager, type AdminGalleryImage } from "@/components/admin/gallery-manager";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Gallery" };

export default async function AdminGalleryPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gallery")
    .select("*")
    .order("created_at", { ascending: false });

  const images: AdminGalleryImage[] = (data ?? []).map((row) => ({
    id: row.id,
    url: row.image_url,
    caption: row.caption,
    width: row.width ?? null,
    height: row.height ?? null,
  }));

  return (
    <div className="p-6 sm:p-10">
      <FadeIn>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Website</p>
        <h1 className="mt-2 font-display text-5xl tracking-wide text-charcoal sm:text-6xl">Gallery</h1>
        <p className="mt-1 text-charcoal/60">
          Uploaded photos appear at the top of the public Gallery page.
        </p>
      </FadeIn>

      {error ? (
        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <AlertCircle className="size-5 shrink-0" />
          Couldn&apos;t load the gallery. Please refresh the page.
        </div>
      ) : (
        <GalleryManager images={images} />
      )}
    </div>
  );
}
