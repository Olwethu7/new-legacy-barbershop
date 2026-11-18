import type { PromoCodeRow } from "@/lib/database.types";

/** Letters, digits and dashes, 3–24 characters, stored upper-case (e.g. "LEGACY20", "REF-K7MX2Q"). */
export const PROMO_CODE_RE = /^[A-Z0-9-]{3,24}$/;

export function normalizePromoCode(value: unknown) {
  return String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export type PromoState = "active" | "expired" | "used_up" | "disabled";

export const PROMO_STATE_LABELS: Record<PromoState, string> = {
  active: "Active",
  expired: "Expired",
  used_up: "Used",
  disabled: "Disabled",
};

export const PROMO_STATE_STYLES: Record<PromoState, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  expired: "bg-charcoal/5 text-charcoal/55 ring-charcoal/10",
  used_up: "bg-sky-50 text-sky-800 ring-sky-200",
  disabled: "bg-red-50 text-red-700 ring-red-200",
};

export function promoState(
  promo: Pick<PromoCodeRow, "active" | "expires_at" | "max_uses" | "uses">,
  now = Date.now(),
): PromoState {
  if (!promo.active) return "disabled";
  if (promo.expires_at && new Date(promo.expires_at).getTime() <= now) return "expired";
  if (promo.max_uses !== null && promo.uses >= promo.max_uses) return "used_up";
  return "active";
}

export const shortDate = new Intl.DateTimeFormat("en-ZA", {
  dateStyle: "medium",
  timeZone: "Africa/Johannesburg",
});
