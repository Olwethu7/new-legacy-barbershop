import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Where the "confirm your email" link lands. Swaps the one-time code for a session
 * cookie, then sends the customer on to their account.
 * Lives outside /account so the proxy doesn't bounce the (still signed-out) visitor to login first.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  // Only ever redirect within this site.
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destination, origin));
    console.error("auth/callback:", error.message);
  }

  return NextResponse.redirect(new URL("/account/login", origin));
}
