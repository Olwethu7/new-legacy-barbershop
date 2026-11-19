"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/auth";
import { PROOF_CODE_RE, normalizeProofCode } from "@/lib/referrals";
import { createClient } from "@/lib/supabase/server";

const MIGRATION_HINT = "Has supabase/migrations/005_referral_points.sql been run?";

// ---------- Customer ----------

export type ProofCodeResult = { ok: true; code: string; createdAt: string } | { ok: false; error: string };

/** The referred friend's in-store proof code. Reuses a still-valid one, otherwise makes a new one. */
export async function generateReferralProofCode(): Promise<ProofCodeResult> {
  await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_referral_proof_code");

  if (error) {
    if (error.message.includes("NOT_REFERRED")) {
      return { ok: false, error: "Proof codes are for customers who signed up with a friend's referral link." };
    }
    if (error.message.includes("ALREADY_CREDITED")) {
      return { ok: false, error: "Your referral has already been confirmed. Thank you!" };
    }
    console.error("create_referral_proof_code:", error.message);
    return { ok: false, error: "Couldn't create a code right now. Please try again." };
  }

  const row = (data as { code: string; created_at: string }[] | null)?.[0];
  if (!row) return { ok: false, error: "Couldn't create a code right now. Please try again." };

  revalidatePath("/account");
  return { ok: true, code: row.code, createdAt: row.created_at };
}

// ---------- Admin ----------

export type ConfirmReferralResult =
  | { ok: true; code: string; referrer: string; friend: string; points: number; rewarded: boolean }
  | { ok: false; error: string };

type ConfirmRow = {
  status: "ok" | "not_found" | "expired" | "already_claimed" | "already_credited";
  referrer_name: string | null;
  friend_name: string | null;
  points: number | null;
  rewarded: boolean;
};

/** Confirms a Referral Proof Code shown in-store and gives the referrer their point. */
export async function confirmReferralCode(rawCode: string): Promise<ConfirmReferralResult> {
  await requireAdmin();

  const code = normalizeProofCode(rawCode);
  if (!PROOF_CODE_RE.test(code)) {
    return { ok: false, error: "That doesn't look like a Referral Proof Code (e.g. REF-8X2BK7)." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("confirm_referral_claim", { p_code: code });

  if (error) {
    console.error("confirm_referral_claim:", error.message);
    return { ok: false, error: `Couldn't check the code. ${MIGRATION_HINT}` };
  }

  const row = (data as ConfirmRow[] | null)?.[0];
  switch (row?.status) {
    case "ok":
      revalidatePath("/admin/referrals");
      revalidatePath("/admin");
      return {
        ok: true,
        code,
        referrer: row.referrer_name ?? "the referrer",
        friend: row.friend_name ?? "their friend",
        points: row.points ?? 0,
        rewarded: row.rewarded,
      };
    case "expired":
      return { ok: false, error: `${code} has expired (codes last 7 days). Ask the customer to generate a new one.` };
    case "already_claimed":
      return { ok: false, error: `${code} has already been confirmed.` };
    case "already_credited":
      return {
        ok: false,
        error: `${row.friend_name ?? "This customer"} has already earned ${row.referrer_name ?? "their referrer"} a point.`,
      };
    default:
      return { ok: false, error: `${code} wasn't found. Check the code and try again.` };
  }
}

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Marks a customer's 20%-off haircut reward as used. */
export async function redeemServiceDiscount(profileId: string): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("redeem_service_discount", { p_profile: profileId });

  if (error) {
    console.error("redeem_service_discount:", error.message);
    return { ok: false, error: `Couldn't update the reward. ${MIGRATION_HINT}` };
  }
  if (!data) return { ok: false, error: "That reward was already used." };

  revalidatePath("/admin/referrals");
  return { ok: true };
}
