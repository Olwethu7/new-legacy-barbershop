"use server";

import { PROMO_CODE_RE, normalizePromoCode } from "@/lib/promo";
import { createClient } from "@/lib/supabase/server";

export type OrderLine = {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  line_total: number;
};

export type CheckoutInput = {
  customerName: string;
  phone: string;
  items: { id: string; quantity: number }[];
  /** Optional promo code; re-checked on the server and again by the database. */
  promoCode?: string | null;
};

export type CheckoutResult =
  | {
      ok: true;
      orderRef: string;
      customerName: string;
      phone: string;
      items: OrderLine[];
      subtotal: number;
      promoCode: string | null;
      discount: number;
      total: number;
    }
  | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PromoCheck = { ok: true; code: string; discountPercent: number } | { ok: false; error: string };

const PROMO_INVALID = "That code isn't valid, has expired or has already been used.";

/** Looks a promo code up for the current visitor (personal referral codes only work for their owner). */
async function lookupPromo(supabase: Awaited<ReturnType<typeof createClient>>, raw: unknown): Promise<PromoCheck> {
  const code = normalizePromoCode(raw);
  if (!PROMO_CODE_RE.test(code)) return { ok: false, error: PROMO_INVALID };

  const { data, error } = await supabase.rpc("validate_promo_code", { p_code: code });

  if (error) {
    console.error("validate_promo_code:", error.message);
    return { ok: false, error: "We couldn't check that code right now. Please try again." };
  }
  const row = (data as { code: string; discount_percent: number }[] | null)?.[0];
  return row ? { ok: true, code: row.code.toUpperCase(), discountPercent: row.discount_percent } : { ok: false, error: PROMO_INVALID };
}

/** Called from the cart's "Apply" button. */
export async function checkPromoCode(code: string): Promise<PromoCheck> {
  return lookupPromo(await createClient(), code);
}

/** Same rounding as prepare_order() in supabase/migrations/004. */
const discountFor = (subtotal: number, percent: number) => Math.round(subtotal * percent) / 100;

/**
 * Saves a pending order. Prices, stock and the promo code are re-checked against the database,
 * so a customer can't change what they pay by editing their cart in the browser.
 */
export async function placeOrder(input: CheckoutInput): Promise<CheckoutResult> {
  const customerName = String(input?.customerName ?? "").trim().replace(/\s+/g, " ");
  const phone = String(input?.phone ?? "").trim();
  const phoneDigits = phone.replace(/\D/g, "");

  if (customerName.length < 2 || customerName.length > 80) {
    return { ok: false, error: "Please enter your name." };
  }
  if (!/^\+?[\d\s()-]+$/.test(phone) || phoneDigits.length < 9 || phoneDigits.length > 15) {
    return { ok: false, error: "Please enter a valid phone number." };
  }

  // Merge duplicates and validate the cart.
  const quantities = new Map<string, number>();
  for (const item of Array.isArray(input?.items) ? input.items : []) {
    const qty = Number(item?.quantity);
    if (typeof item?.id !== "string" || !UUID.test(item.id) || !Number.isInteger(qty) || qty < 1 || qty > 99) {
      return { ok: false, error: "Your cart has an invalid item. Please remove it and try again." };
    }
    quantities.set(item.id, Math.min((quantities.get(item.id) ?? 0) + qty, 99));
  }
  if (quantities.size === 0) return { ok: false, error: "Your cart is empty." };
  if (quantities.size > 50) return { ok: false, error: "Too many different items in one order." };

  // Signed-in customers' orders are linked to their account (the database sets customer_id).
  const supabase = await createClient();

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, price, stock_status")
    .in("id", [...quantities.keys()]);

  if (productsError) {
    console.error("Checkout: failed to load products:", productsError.message);
    return { ok: false, error: "We couldn't place your order right now. Please try again." };
  }

  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  const unavailable: string[] = [];
  const items: OrderLine[] = [];

  for (const [id, quantity] of quantities) {
    const product = byId.get(id);
    if (!product || product.stock_status === "out_of_stock") {
      unavailable.push(product?.name ?? "An item");
      continue;
    }
    const price = Number(product.price);
    items.push({ product_id: id, name: product.name, price, quantity, line_total: price * quantity });
  }

  if (unavailable.length > 0) {
    return {
      ok: false,
      error: `Sorry, ${unavailable.join(", ")} ${unavailable.length === 1 ? "is" : "are"} no longer available. Please remove ${unavailable.length === 1 ? "it" : "them"} from your cart.`,
    };
  }

  const subtotal = items.reduce((sum, line) => sum + line.line_total, 0);

  let promoCode: string | null = null;
  let discount = 0;
  if (input?.promoCode && String(input.promoCode).trim()) {
    const promo = await lookupPromo(supabase, input.promoCode);
    if (!promo.ok) return promo;
    promoCode = promo.code;
    discount = discountFor(subtotal, promo.discountPercent);
  }
  const total = Math.max(subtotal - discount, 0);

  // Customers can't read orders back (RLS), so create the id here instead of selecting it after insert.
  const id = crypto.randomUUID();
  const { error: insertError } = await supabase.from("orders").insert({
    id,
    customer_name: customerName,
    phone,
    items,
    subtotal,
    status: "pending",
    // Only sent with a code, so checkout keeps working before migration 004 is run.
    ...(promoCode ? { promo_code: promoCode } : {}),
  });

  if (insertError) {
    // Raised by prepare_order() if the code was used up between "Apply" and "Place Order".
    if (insertError.message.includes("PROMO_INVALID")) return { ok: false, error: PROMO_INVALID };
    console.error("Checkout: failed to save order:", insertError.message);
    return { ok: false, error: "We couldn't place your order right now. Please try again." };
  }

  return {
    ok: true,
    orderRef: id.slice(0, 8).toUpperCase(),
    customerName,
    phone,
    items,
    subtotal,
    promoCode,
    discount,
    total,
  };
}
