import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before every /admin request:
 * - refreshes the Supabase login session cookie when it's about to expire
 * - sends signed-out visitors to /admin/login, and signed-in admins away from it
 *
 * This is a fast first check. The admin layout checks again on the server.
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
  const onLoginPage = request.nextUrl.pathname === "/admin/login";

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
  // Only the admin area needs auth, so the public site stays fully static.
  matcher: ["/admin", "/admin/:path*"],
};
