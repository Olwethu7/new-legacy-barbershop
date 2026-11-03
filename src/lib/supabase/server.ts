import { createServerClient } from "@supabase/ssr";
import { io } from "next/cache";
import { cookies } from "next/headers";

/** Supabase client for Server Components, Server Actions and Route Handlers, signed in as the current visitor. */
export async function createClient() {
  const cookieStore = await cookies();

  // Supabase checks the login token's expiry against the current time (Date.now()).
  // With Partial Prefetching, Next pre-renders an "app shell" that can read cookies
  // but must not read the clock, so wait here until a real request is rendering.
  await io();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components can't set cookies. Safe to ignore: src/proxy.ts refreshes the session.
          }
        },
      },
    },
  );
}
