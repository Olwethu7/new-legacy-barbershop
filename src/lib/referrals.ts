// Referral rules shared by the customer dashboard and the admin pages.
// Keep in sync with supabase/migrations/005_referral_points.sql.

/** Points needed for a reward (referral_points_goal() in SQL). */
export const REFERRAL_POINTS_GOAL = 5;
/** Shop discount on the reward promo code. */
export const REFERRAL_SHOP_PERCENT = 10;
/** Haircut discount that comes with each reward. */
export const REFERRAL_SERVICE_PERCENT = 20;

/** A Referral Proof Code is valid for 7 days after it is created. */
export const PROOF_CODE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** "REF-" + 6 characters from the same alphabet as generate_code() (no 0/O/1/I). */
export const PROOF_CODE_RE = /^REF-[A-HJ-NP-Z2-9]{6}$/;

/** Accepts "ref-8x2bk7", "REF 8X2BK7" or just "8X2BK7" and returns "REF-8X2BK7". */
export function normalizeProofCode(value: unknown) {
  const raw = String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `REF-${raw.length === 9 && raw.startsWith("REF") ? raw.slice(3) : raw}`;
}

export function proofCodeExpiresAt(createdAt: string) {
  return new Date(createdAt).getTime() + PROOF_CODE_TTL_MS;
}
