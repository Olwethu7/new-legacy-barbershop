"use client";

import { useCallback, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight, Loader2, Phone, ShoppingCart, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { deleteOrder, updateOrderStatus } from "@/lib/actions/admin-orders";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  type OrderStatus,
} from "@/lib/order-status";
import { EASE_LUXE } from "@/lib/motion";
import { formatRand } from "@/lib/services";

export type AdminOrderLine = {
  key: string;
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
};

export type AdminOrder = {
  id: string;
  ref: string;
  dateLabel: string;
  customerName: string;
  phone: string;
  items: AdminOrderLine[];
  itemCount: number;
  subtotal: number;
  status: OrderStatus;
};

type OptimisticChange = { type: "status"; id: string; status: OrderStatus } | { type: "delete"; id: string };

/** wa.me needs the number in international format without "+" (e.g. 27711234567). */
function whatsappLink(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `27${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
}

export function OrdersTable({ orders }: { orders: AdminOrder[] }) {
  // Changes show instantly; they settle to the server's data once the action finishes.
  const [optimisticOrders, applyChange] = useOptimistic(orders, (current: AdminOrder[], change: OptimisticChange) =>
    change.type === "delete"
      ? current.filter((o) => o.id !== change.id)
      : current.map((o) => (o.id === change.id ? { ...o, status: change.status } : o)),
  );
  const [, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = optimisticOrders.find((o) => o.id === selectedId) ?? null;
  const closePanel = useCallback(() => setSelectedId(null), []);

  function changeStatus(order: AdminOrder, status: OrderStatus) {
    if (status === order.status) return;
    startTransition(async () => {
      applyChange({ type: "status", id: order.id, status });
      const result = await updateOrderStatus(order.id, status);
      if (result.ok) toast.success(`Order #${order.ref} marked as ${ORDER_STATUS_LABELS[status]}`);
      else toast.error(result.error);
    });
  }

  async function removeOrder(order: AdminOrder) {
    const result = await deleteOrder(order.id);
    if (result.ok) {
      setSelectedId(null);
      toast.success(`Order #${order.ref} deleted`);
    } else {
      toast.error(result.error);
    }
    return result.ok;
  }

  if (optimisticOrders.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-center rounded-2xl border border-charcoal/10 bg-white px-6 py-16 text-center shadow-sm">
        <div className="flex size-16 items-center justify-center rounded-full bg-charcoal text-gold">
          <ShoppingCart className="size-7" strokeWidth={1.5} />
        </div>
        <h2 className="mt-5 font-display text-3xl tracking-wide text-charcoal">No orders yet</h2>
        <p className="mt-1 text-sm text-charcoal/60">Orders placed in the shop will appear here.</p>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.12, ease: EASE_LUXE }}
        className="mt-8 overflow-hidden rounded-2xl border border-charcoal/10 bg-white shadow-sm"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-charcoal/10 bg-charcoal/[0.03] text-xs uppercase tracking-[0.15em] text-charcoal/50">
              <tr>
                <th scope="col" className="px-5 py-4 font-semibold">Order</th>
                <th scope="col" className="px-5 py-4 font-semibold">Date</th>
                <th scope="col" className="px-5 py-4 font-semibold">Customer</th>
                <th scope="col" className="px-5 py-4 font-semibold">Phone</th>
                <th scope="col" className="px-5 py-4 font-semibold">Items</th>
                <th scope="col" className="px-5 py-4 font-semibold">Subtotal</th>
                <th scope="col" className="px-5 py-4 font-semibold">Status</th>
                <th scope="col" className="px-5 py-4">
                  <span className="sr-only">View</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal/5">
              {optimisticOrders.map((order, i) => (
                <motion.tr
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + Math.min(i, 15) * 0.04, ease: EASE_LUXE }}
                  key={order.id}
                  onClick={() => setSelectedId(order.id)}
                  className={`group cursor-pointer transition-colors hover:bg-gold/[0.05] ${
                    order.id === selectedId ? "bg-gold/[0.07]" : ""
                  }`}
                >
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(order.id);
                      }}
                      className="font-mono text-xs font-semibold tracking-wider text-charcoal hover:text-gold focus-visible:text-gold"
                      aria-label={`View order ${order.ref}`}
                    >
                      #{order.ref}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-charcoal/60">{order.dateLabel}</td>
                  <td className="px-5 py-4 font-medium text-charcoal">{order.customerName}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-charcoal/70">{order.phone}</td>
                  <td className="px-5 py-4 text-charcoal/70">{order.itemCount}</td>
                  <td className="whitespace-nowrap px-5 py-4 font-display text-xl tracking-wide text-charcoal">
                    {formatRand(order.subtotal)}
                  </td>
                  <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                    <StatusSelect order={order} onChange={changeStatus} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <ChevronRight className="ml-auto size-4 text-charcoal/30 transition-transform group-hover:translate-x-0.5 group-hover:text-gold" />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      <OrderPanel
        order={selected}
        onClose={closePanel}
        onStatusChange={changeStatus}
        onDelete={removeOrder}
      />
    </>
  );
}

function StatusSelect({
  order,
  onChange,
  large,
}: {
  order: AdminOrder;
  onChange: (order: AdminOrder, status: OrderStatus) => void;
  large?: boolean;
}) {
  return (
    <div className="relative inline-flex">
      <select
        value={order.status}
        onChange={(e) => onChange(order, e.target.value as OrderStatus)}
        aria-label={`Status for order ${order.ref}`}
        className={`cursor-pointer appearance-none rounded-full font-semibold ring-1 ring-inset transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
          large ? "py-2.5 pl-4 pr-10 text-sm" : "py-1.5 pl-3 pr-8 text-xs"
        } ${ORDER_STATUS_STYLES[order.status]}`}
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {ORDER_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <ChevronDown
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 opacity-60 ${large ? "right-3.5 size-4" : "right-2.5 size-3.5"}`}
      />
    </div>
  );
}

function OrderPanel({
  order,
  onClose,
  onStatusChange,
  onDelete,
}: {
  order: AdminOrder | null;
  onClose: () => void;
  onStatusChange: (order: AdminOrder, status: OrderStatus) => void;
  onDelete: (order: AdminOrder) => Promise<boolean>;
}) {
  const open = order !== null;
  const closeRef = useRef<HTMLButtonElement>(null);

  // Keep showing the last order while the panel slides out.
  const [shown, setShown] = useState<AdminOrder | null>(order);
  if (order && order !== shown) setShown(order);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} inert={!open}>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`absolute inset-0 bg-charcoal/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-panel-title"
        className={`absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-offwhite shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {shown && (
          <>
            <header className="bg-charcoal px-6 py-6 text-offwhite sm:px-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Order</p>
                  <h2 id="order-panel-title" className="mt-1 font-mono text-2xl font-semibold tracking-wider">
                    #{shown.ref}
                  </h2>
                  <p className="mt-1 text-sm text-offwhite/50">{shown.dateLabel}</p>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={onClose}
                  aria-label="Close order details"
                  className="inline-flex size-10 items-center justify-center rounded-full transition-colors hover:bg-white/10"
                >
                  <X className="size-5" />
                </button>
              </div>
            </header>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
              {/* Status */}
              <section className="flex items-center justify-between gap-4 rounded-2xl border border-charcoal/10 bg-white p-5">
                <p className="text-sm font-semibold text-charcoal">Status</p>
                <StatusSelect order={shown} onChange={onStatusChange} large />
              </section>

              {/* Customer */}
              <section className="rounded-2xl border border-charcoal/10 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-charcoal/40">Customer</p>
                <p className="mt-2 text-lg font-semibold text-charcoal">{shown.customerName}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={`tel:${shown.phone.replace(/[^\d+]/g, "")}`}
                    className="inline-flex items-center gap-2 rounded-full border border-charcoal/15 px-4 py-2 text-sm font-medium text-charcoal transition-colors hover:border-gold hover:text-gold"
                  >
                    <Phone className="size-4" />
                    {shown.phone}
                  </a>
                  <a
                    href={whatsappLink(shown.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    <WhatsAppIcon className="size-4" />
                    WhatsApp
                  </a>
                </div>
              </section>

              {/* Items */}
              <section className="overflow-hidden rounded-2xl border border-charcoal/10 bg-white">
                <p className="border-b border-charcoal/10 px-5 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-charcoal/40">
                  Items ({shown.itemCount})
                </p>
                {shown.items.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-charcoal/50">No item details saved for this order.</p>
                ) : (
                  <ul className="divide-y divide-charcoal/5">
                    {shown.items.map((line) => (
                      <li key={line.key} className="flex items-center justify-between gap-4 px-5 py-4">
                        <div className="min-w-0">
                          <p className="font-medium text-charcoal">{line.name}</p>
                          <p className="text-sm text-charcoal/50">
                            {line.quantity} × {formatRand(line.price)}
                          </p>
                        </div>
                        <p className="shrink-0 font-semibold text-charcoal">{formatRand(line.lineTotal)}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-baseline justify-between border-t border-charcoal/10 bg-charcoal/[0.03] px-5 py-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-charcoal/50">Subtotal</span>
                  <span className="font-display text-3xl leading-none tracking-wide text-gold">
                    {formatRand(shown.subtotal)}
                  </span>
                </div>
              </section>
            </div>

            <footer className="border-t border-charcoal/10 bg-white px-6 py-5 sm:px-8">
              <DeleteOrderButton key={shown.id} order={shown} onDelete={onDelete} />
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}

function DeleteOrderButton({
  order,
  onDelete,
}: {
  order: AdminOrder;
  onDelete: (order: AdminOrder) => Promise<boolean>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
      >
        <Trash2 className="size-4" />
        Delete Order
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-medium text-red-800">
        Delete order #{order.ref}? This can&apos;t be undone.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            const ok = await onDelete(order);
            if (!ok) setPending(false);
          }}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          {pending ? "Deleting…" : "Yes, delete"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
          className="flex-1 rounded-full border border-charcoal/15 bg-white px-5 py-2.5 text-sm font-semibold text-charcoal transition-colors hover:bg-charcoal/5 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
