import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import { imageSize } from "image-size";
import { createPublicClient } from "@/lib/supabase/public";

export type GalleryImage = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

const GALLERY_DIR = path.join(process.cwd(), "public", "gallery");
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);
/** Site artwork that lives in the folder but isn't a gallery photo (e.g. the hero cut-out). */
const EXCLUDE = /removebg/i;

/** Camera and WhatsApp default names say nothing useful, so they get a generic description. */
const GENERIC_NAME = /^(img|dsc|pxl|photo|image|whatsapp image|screenshot|snapchat|received)[\s_-]?/i;

function altFromFilename(file: string, index: number) {
  const base = path.parse(file).name;
  if (GENERIC_NAME.test(base) || !/[a-z]{3,}/i.test(base)) {
    return `Haircut by New Legacy Barbershop, photo ${index + 1}`;
  }
  return base.replace(/\s*\(\d+\)$/, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Every image in public/gallery/, sorted by filename, with real dimensions so
 * the masonry grid doesn't jump while photos load. Restart `npm run dev` after
 * adding new photos if they don't appear.
 */
async function getFolderImages(): Promise<GalleryImage[]> {
  "use cache";

  let files: string[];
  try {
    files = await readdir(GALLERY_DIR);
  } catch {
    return [];
  }

  const imageFiles = files
    .filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()) && !EXCLUDE.test(f))
    // Compare names without the extension so "photo.jpeg" sorts before "photo (1).jpeg".
    .sort((a, b) =>
      path.parse(a).name.localeCompare(path.parse(b).name, undefined, { numeric: true, sensitivity: "base" }),
    );

  const images = await Promise.all(
    imageFiles.map(async (file, i): Promise<GalleryImage | null> => {
      try {
        const size = imageSize(await readFile(path.join(GALLERY_DIR, file)));
        // Phone photos are often stored sideways with a "rotate me" flag (EXIF 5-8).
        const rotated = size.orientation !== undefined && size.orientation >= 5;
        return {
          src: `/gallery/${encodeURIComponent(file)}`,
          width: rotated ? size.height : size.width,
          height: rotated ? size.width : size.height,
          alt: altFromFilename(file, i),
        };
      } catch {
        console.warn(`Skipping unreadable gallery image: ${file}`);
        return null;
      }
    }),
  );

  return images.filter((img): img is GalleryImage => img !== null);
}

/** Images uploaded from the admin Gallery manager (Supabase `gallery` table), newest first. */
async function getUploadedImages(): Promise<GalleryImage[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("gallery");

  const { data, error } = await createPublicClient()
    .from("gallery")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load gallery:", error.message);
    return [];
  }

  return (data ?? []).map((row, i) => ({
    src: row.image_url,
    // Older rows may not have dimensions; the grid still sizes them correctly once loaded.
    width: row.width ?? 1200,
    height: row.height ?? 1500,
    alt: row.caption || `New Legacy Barbershop work, photo ${i + 1}`,
  }));
}

/** Everything shown on the public Gallery page: admin uploads first, then photos in public/gallery/. */
export async function getGalleryImages(): Promise<GalleryImage[]> {
  const [uploaded, folder] = await Promise.all([getUploadedImages(), getFolderImages()]);
  return [...uploaded, ...folder];
}
