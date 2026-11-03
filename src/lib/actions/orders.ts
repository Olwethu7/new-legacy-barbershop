"use server";

import { createPublicClient } from "@/lib/supabase/public";

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
};

export type CheckoutResult =
  | { ok: true; orderRef: string; customerName: string; phone: string; items: OrderLine[]; subtotal: number }
  | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Saves a pending order. Prices and stock are re-checked against the database,
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

  const supabase = createPublicClient();

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

  // Customers can't read orders back (RLS), so create the id here instead of selecting it after insert.
  const id = crypto.randomUUID();
  const { error: insertError } = await supabase.from("orders").insert({
    id,
    customer_name: customerName,
    phone,
    items,
    subtotal,
    status: "pending",
  });

  if (insertError) {
    console.error("Checkout: failed to save order:", insertError.message);
    return { ok: false, error: "We couldn't place your order right now. Please try again." };
  }

  return { ok: true, orderRef: id.slice(0, 8).toUpperCase(), customerName, phone, items, subtotal };
}
