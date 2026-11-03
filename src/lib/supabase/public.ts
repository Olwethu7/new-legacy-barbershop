import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client for public (logged-out) reads. It doesn't use cookies,
 * so it's safe to use inside cached server code.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  }

  return createClient(url, key, { auth: { persistSession: false } });
}
