import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Customer pages that signed-out visitors can open. */
const ACCOUNT_PUBLIC = new Set(["/account/login", "/account/register"]);

/**
 * Runs before every /admin and /account request:
 * - refreshes the Supabase login session cookie when it's about to expire
 * - sends signed-out visitors to the right login page, and signed-in users away from it
 *
 * This is a fast first check only: it knows *whether* you're signed in, not whether
 * you're an admin. The admin layout checks the role on the server (requireAdmin).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Verifies the session token. Don't run other code between createServerClient and this call.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  if (pathname === "/account" || pathname.startsWith("/account/")) {
    const isPublic = ACCOUNT_PUBLIC.has(pathname);
    if (!signedIn && !isPublic) return redirectWithCookies(request, "/account/login", response);
    if (signedIn && isPublic) return redirectWithCookies(request, "/account", response);
    return response;
  }

  const onLoginPage = pathname === "/admin/login";
  if (!signedIn && !onLoginPage) {
    return redirectWithCookies(request, "/admin/login", response);
  }
  if (signedIn && onLoginPage) {
    return redirectWithCookies(request, "/admin", response);
  }

  return response;
}

/** Redirect while keeping any refreshed session cookies. */
function redirectWithCookies(request: NextRequest, pathname: string, from: NextResponse) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  // Only the admin and customer areas need auth, so the rest of the site stays fully static.
  matcher: ["/admin", "/admin/:path*", "/account", "/account/:path*"],
};
