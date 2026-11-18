import { redirect } from "next/navigation";
import type { ProfileRow } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type Admin = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  /** "First Last", or the part of the email before the @ when no name is saved. */
  displayName: string;
};

export type Customer = {
  id: string;
  email: string;
  profile: ProfileRow | null;
};

/** Postgres / PostgREST "table doesn't exist" (migration 004 not run yet). */
const isMissingTable = (code?: string) => code === "42P01" || code === "PGRST205";

function displayName(first: string | null, last: string | null, email: string) {
  const full = [first, last].filter(Boolean).join(" ").trim();
  return full || email.split("@")[0];
}

/**
 * Returns the signed-in admin, or redirects: signed-out visitors go to /admin/login,
 * signed-in customers go to their own /account page.
 * Call this from any admin Server Component or Server Action that needs protecting.
 *
 * Admins are profiles with role = 'admin' (supabase/migrations/004). Until that
 * migration is run, any signed-in user still counts as an admin, as before.
 */
export async function requireAdmin(): Promise<Admin> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/admin/login");
  }

  const id = data.claims.sub;
  const email = typeof data.claims.email === "string" ? data.claims.email : "";

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("first_name, last_name, role")
    .eq("id", id)
    .maybeSingle<Pick<ProfileRow, "first_name" | "last_name" | "role">>();

  if (profileError) {
    if (isMissingTable(profileError.code)) {
      console.warn("requireAdmin: run supabase/migrations/004 to enable admin roles.");
      return { id, email, firstName: null, lastName: null, displayName: displayName(null, null, email) };
    }
    console.error("requireAdmin:", profileError.message);
    redirect("/admin/login");
  }

  if (profile?.role !== "admin") {
    redirect("/account");
  }

  return {
    id,
    email,
    firstName: profile.first_name,
    lastName: profile.last_name,
    displayName: displayName(profile.first_name, profile.last_name, email),
  };
}

/** Returns the signed-in customer (any signed-in user) with their profile, or redirects to /account/login. */
export async function requireUser(): Promise<Customer> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/account/login");
  }

  const id = data.claims.sub;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle<ProfileRow>();

  return {
    id,
    email: typeof data.claims.email === "string" ? data.claims.email : "",
    profile: profile ?? null,
  };
}
