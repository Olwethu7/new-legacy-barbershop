import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Admin = {
  id: string;
  email: string;
};

/**
 * Returns the signed-in admin, or redirects to /admin/login.
 * Call this from any admin Server Component or Server Action that needs protecting.
 *
 * Note: any signed-in Supabase user counts as an admin, so keep public
 * sign-ups disabled in Supabase (Authentication → Sign In / Providers).
 */
export async function requireAdmin(): Promise<Admin> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/admin/login");
  }

  return {
    id: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : "",
  };
}
