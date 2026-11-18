"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type ProfileInput = {
  firstName: string;
  lastName: string;
  phone: string;
  marketingOptIn: boolean;
};

const clean = (value: unknown, max: number) => String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);

/** Customers can edit their own name, phone and marketing preference (never their role). */
export async function updateProfile(input: ProfileInput): Promise<ActionResult> {
  const user = await requireUser();

  const firstName = clean(input?.firstName, 40);
  const lastName = clean(input?.lastName, 40);
  const phone = clean(input?.phone, 20);
  const digits = phone.replace(/\D/g, "");

  if (firstName.length < 1) return { ok: false, error: "Please enter your first name." };
  if (phone && (!/^\+?[\d\s()-]+$/.test(phone) || digits.length < 9 || digits.length > 15)) {
    return { ok: false, error: "Please enter a valid phone number." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName || null,
      phone: phone || null,
      marketing_opt_in: input?.marketingOptIn !== false,
    })
    .eq("id", user.id)
    .select("id");

  if (error) {
    console.error("updateProfile:", error.message);
    return { ok: false, error: "Couldn't save your details. Please try again." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Your profile isn't set up yet. Please contact us." };
  }

  revalidatePath("/account");
  return { ok: true };
}
