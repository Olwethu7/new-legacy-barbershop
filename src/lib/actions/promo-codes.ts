"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { PROMO_CODE_RE, normalizePromoCode } from "@/lib/promo";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type PromoInput = {
  code: string;
  discountPercent: number | string;
  /** "YYYY-MM-DD" (valid until the end of that day, SA time), or empty for no expiry. */
  expiresOn: string;
  /** Empty for unlimited. */
  maxUses: number | string | null;
};

const refresh = () => revalidatePath("/admin/promo-codes");

export async function createPromoCode(input: PromoInput): Promise<ActionResult> {
  await requireAdmin();

  const code = normalizePromoCode(input?.code);
  const percent = Number(input?.discountPercent);
  const expiresOn = String(input?.expiresOn ?? "").trim();
  const rawMax = input?.maxUses === null || input?.maxUses === undefined ? "" : String(input.maxUses).trim();
  const maxUses = rawMax === "" ? null : Number(rawMax);

  if (!PROMO_CODE_RE.test(code)) return { ok: false, error: "Use 3–24 letters, numbers or dashes (e.g. LEGACY20)." };
  if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
    return { ok: false, error: "Discount must be a whole number from 1 to 100." };
  }
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100000)) {
    return { ok: false, error: "Max uses must be a whole number, or leave it blank for unlimited." };
  }

  let expiresAt: string | null = null;
  if (expiresOn) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresOn)) return { ok: false, error: "Choose a valid expiry date." };
    const end = new Date(`${expiresOn}T23:59:59+02:00`);
    if (Number.isNaN(end.getTime())) return { ok: false, error: "Choose a valid expiry date." };
    if (end.getTime() < Date.now()) return { ok: false, error: "The expiry date is in the past." };
    expiresAt = end.toISOString();
  }

  const supabase = await createClient();
  const { error } = await supabase.from("promo_codes").insert({
    code,
    discount_percent: percent,
    expires_at: expiresAt,
    max_uses: maxUses,
    source: "admin",
  });

  if (error) {
    if (error.code === "23505") return { ok: false, error: `The code ${code} already exists.` };
    console.error("createPromoCode:", error.message);
    return { ok: false, error: "Couldn't create the code. Has supabase/migrations/004 been run?" };
  }

  refresh();
  return { ok: true };
}

export async function setPromoCodeActive(id: string, active: boolean): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase.from("promo_codes").update({ active: Boolean(active) }).eq("id", id).select("id");

  if (error) {
    console.error("setPromoCodeActive:", error.message);
    return { ok: false, error: "Couldn't update the code. Please try again." };
  }
  if (!data || data.length === 0) return { ok: false, error: "That code no longer exists." };

  refresh();
  return { ok: true };
}

export async function deletePromoCode(id: string): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase.from("promo_codes").delete().eq("id", id).select("id");

  if (error) {
    console.error("deletePromoCode:", error.message);
    return { ok: false, error: "Couldn't delete the code. Please try again." };
  }
  if (!data || data.length === 0) return { ok: false, error: "That code no longer exists." };

  refresh();
  return { ok: true };
}
