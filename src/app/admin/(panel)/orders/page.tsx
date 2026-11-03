import type { Metadata } from "next";
import { AlertCircle } from "lucide-react";
import { FadeIn } from "@/components/admin/admin-motion";
import { OrdersTable, type AdminOrder, type AdminOrderLine } from "@/components/admin/orders-table";
import { isOrderStatus } from "@/lib/order-status";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Orders" };

const dateFormat = new Intl.DateTimeFormat("en-ZA", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Johannesburg",
});

/** Orders store their items as JSON, so read each line defensively. */
function parseItems(raw: unknown): AdminOrderLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    const line = (item ?? {}) as Record<string, unknown>;
    const price = Number(line.price) || 0;
    const quantity = Math.max(1, Math.floor(Number(line.quantity ?? line.qty) || 1));
    return {
      key: String(line.product_id ?? i),
      name: typeof line.name === "string" && line.name ? line.name : "Unnamed item",
      price,
      quantity,
      lineTotal: Number(line.line_total) || price * quantity,
    };
  });
}

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, customer_name, phone, items, subtotal, status, created_at")
    .order("created_at", { ascending: false });

  const orders: AdminOrder[] = (data ?? []).map((o) => {
    const items = parseItems(o.items);
    return {
      id: o.id,
      ref: o.id.slice(0, 8).toUpperCase(),
      dateLabel: dateFormat.format(new Date(o.created_at)),
      customerName: o.customer_name,
      phone: o.phone,
      items,
      itemCount: items.reduce((sum, line) => sum + line.quantity, 0),
      subtotal: Number(o.subtotal) || 0,
      status: isOrderStatus(o.status) ? o.status : "pending",
    };
  });

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="p-6 sm:p-10">
      <FadeIn>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Shop</p>
        <h1 className="mt-2 font-display text-5xl tracking-wide text-charcoal sm:text-6xl">Orders</h1>
        <p className="mt-1 text-charcoal/60">
          {orders.length} {orders.length === 1 ? "order" : "orders"}
          {pendingCount > 0 && (
            <>
              {" · "}
              <span className="font-semibold text-amber-700">{pendingCount} pending</span>
            </>
          )}
        </p>
      </FadeIn>

      {error ? (
        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <AlertCircle className="size-5 shrink-0" />
          Couldn&apos;t load orders. Please refresh the page.
        </div>
      ) : (
        <OrdersTable orders={orders} />
      )}
    </div>
  );
}
