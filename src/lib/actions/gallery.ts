"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { MEDIA_BUCKET, mediaPathFromUrl } from "@/lib/product-options";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Refresh the public gallery and the admin grid after a change. */
function refreshGallery() {
  updateTag("gallery");
  revalidatePath("/admin/gallery");
}

function toDimension(value: unknown) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n > 0 && n < 20000 ? n : null;
}

export async function addGalleryImage(input: {
  imageUrl: string;
  width?: number | null;
  height?: number | null;
}): Promise<ActionResult> {
  await requireAdmin();

  const imageUrl = String(input?.imageUrl ?? "");
  if (!mediaPathFromUrl(imageUrl)) return { ok: false, error: "Image must be uploaded to the media bucket." };

  const supabase = await createClient();
  let { error } = await supabase.from("gallery").insert({
    image_url: imageUrl,
    width: toDimension(input?.width),
    height: toDimension(input?.height),
  });

  // The width/height columns come from supabase/migrations/002. If they haven't been
  // added yet (Postgres "undefined column"), save the photo without them.
  if (error && (error.code === "42703" || error.code === "PGRST204")) {
    console.warn("addGalleryImage: gallery.width/height missing, saving without them. Run migration 002.");
    ({ error } = await supabase.from("gallery").insert({ image_url: imageUrl }));
  }

  if (error) {
    console.error("addGalleryImage:", error.message);
    return { ok: false, error: "Couldn't save the image. Please try again." };
  }

  refreshGallery();
  return { ok: true };
}

export async function deleteGalleryImage(id: string): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase.from("gallery").delete().eq("id", id).select("image_url");

  if (error) {
    console.error("deleteGalleryImage:", error.message);
    return { ok: false, error: "Couldn't delete the image. Please try again." };
  }
  if (!data || data.length === 0) return { ok: false, error: "That image no longer exists." };

  const path = mediaPathFromUrl(data[0].image_url);
  if (path) {
    const { error: storageError } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    if (storageError) console.warn("deleteGalleryImage: file not removed:", storageError.message);
  }

  refreshGallery();
  return { ok: true };
}
