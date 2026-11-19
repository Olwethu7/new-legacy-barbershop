// Referral rules shared by the customer dashboard and the admin pages.
// Keep in sync with supabase/migrations/006_split_referral_rewards.sql.
//
//   A. Store:   friend's online purchase  -> 1 shop point.    5 points -> 10% shop promo code (30 days).
//   B. Service: friend's in-store visit   -> 1 service point. 5 points -> 20% off a haircut (15 days).

/** Points needed for a reward, in both systems (referral_points_goal() in SQL). */
export const REFERRAL_POINTS_GOAL = 5;

export const SHOP_REWARD_PERCENT = 10;
export const SHOP_REWARD_DAYS = 30;

export const SERVICE_REWARD_PERCENT = 20;
export const SERVICE_REWARD_DAYS = 15;

/** In-store Proof Codes are valid for 7 days. */
export const PROOF_CODE_DAYS = 7;

/** "SRV-" + 6 characters from generate_code()'s alphabet (no 0/O/1/I). Older codes from 005 start with "REF-". */
export const PROOF_CODE_RE = /^(SRV|REF)-[A-HJ-NP-Z2-9]{6}$/;

/** Accepts "srv-8x2bk7", "SRV 8X2BK7" or just "8X2BK7" and returns "SRV-8X2BK7". */
export function normalizeProofCode(value: unknown) {
  const raw = String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (raw.length === 9 && (raw.startsWith("SRV") || raw.startsWith("REF"))) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
  return `SRV-${raw}`;
}
