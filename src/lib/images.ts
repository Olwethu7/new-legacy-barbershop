/** True when next.config.ts allows next/image to optimise this URL. Other hosts are shown as-is. */
export function canOptimizeImage(src: string) {
  try {
    const { hostname, pathname } = new URL(src);
    return (
      hostname === "images.unsplash.com" ||
      (hostname.endsWith(".supabase.co") && pathname.startsWith("/storage/v1/object/public/"))
    );
  } catch {
    return false;
  }
}
