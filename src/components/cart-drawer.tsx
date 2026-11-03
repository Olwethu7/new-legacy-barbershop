"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { placeOrder, type CheckoutResult } from "@/lib/actions/orders";
import { canOptimizeImage } from "@/lib/images";
import { formatRand } from "@/lib/services";
import { site } from "@/lib/site";

type Step = "cart" | "details" | "done";
type PlacedOrder = Extract<CheckoutResult, { ok: true }>;

function whatsappOrderUrl(order: PlacedOrder) {
  const message = [
    `Hi New Legacy, I've just placed order #${order.orderRef}:`,
    "",
    ...order.items.map((i) => `- ${i.quantity} x ${i.name} (${formatRand(i.line_total)})`),
    "",
    `Subtotal: ${formatRand(order.subtotal)}`,
    `Name: ${order.customerName}`,
    `Phone: ${order.phone}`,
  ].join("\n");
  return `${site.whatsappUrl}?text=${encodeURIComponent(message)}`;
}

export function CartDrawer() {
  const { items, itemCount, subtotal, isOpen, closeCart, updateQuantity, removeItem, clearCart } = useCart();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [step, setStep] = useState<Step>("cart");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<PlacedOrder | null>(null);

  // Close, then reset to the cart view once the slide-out has finished.
  const close = () => {
    closeCart();
    if (step !== "cart") {
      setTimeout(() => {
        setStep("cart");
        setError(null);
      }, 300);
    }
  };

  // Latest `close` for the Escape handler, without re-running the effect (which would steal focus).
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });

  // Escape to close, lock page scroll while open, and move focus into the drawer.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  async function handleCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setPending(true);

    const result = await placeOrder({
      customerName: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      items: items.map((i) => ({ id: i.id, quantity: i.quantity })),
    });

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setOrder(result);
    setStep("done");
    clearCart();
    // Try to open WhatsApp straight away. If the browser blocks the pop-up,
    // the confirmation screen has a button to do it.
    const wa = window.open(whatsappOrderUrl(result), "_blank");
    if (wa) wa.opener = null;
  }

  const title = step === "details" ? "Checkout" : step === "done" ? "Order Placed" : "Your Cart";

  return (
    <div className={`fixed inset-0 z-[60] ${isOpen ? "" : "pointer-events-none"}`} inert={!isOpen}>
      {/* Backdrop */}
      <div
        onClick={close}
        aria-hidden="true"
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-charcoal text-offwhite shadow-2xl shadow-black/50 transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-2">
            {step === "details" && (
              <button
                type="button"
                onClick={() => {
                  setStep("cart");
                  setError(null);
                }}
                aria-label="Back to cart"
                className="-ml-2 inline-flex size-9 items-center justify-center rounded-full transition-colors hover:bg-white/10"
              >
                <ArrowLeft className="size-5" />
              </button>
            )}
            <h2 id="cart-title" className="font-display text-3xl tracking-wide">
              {title}
              {step === "cart" && <span className="text-gold"> ({itemCount})</span>}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={close}
            aria-label="Close cart"
            className="inline-flex size-10 items-center justify-center rounded-full transition-colors hover:bg-white/10"
          >
            <X className="size-5" />
          </button>
        </header>

        {step === "done" && order ? (
          <OrderConfirmation order={order} onClose={close} />
        ) : items.length === 0 ? (
          <EmptyCart onClose={close} />
        ) : (
          <>
            <ul className="flex-1 divide-y divide-white/10 overflow-y-auto px-6">
              {items.map((item) => (
                <li key={item.id} className="flex gap-4 py-5">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-charcoal-soft">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        sizes="80px"
                        unoptimized={!canOptimizeImage(item.image_url)}
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gold/60">
                        <ShoppingBag className="size-6" strokeWidth={1.5} />
                      </div>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium leading-snug">{item.name}</p>
                      {step === "cart" && (
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remove ${item.name}`}
                          className="text-offwhite/40 transition-colors hover:text-red-400"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-offwhite/50">{formatRand(item.price)} each</p>

                    <div className="mt-auto flex items-center justify-between pt-3">
                      {step === "cart" ? (
                        <div className="flex items-center rounded-full border border-white/15">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            aria-label={`Decrease quantity of ${item.name}`}
                            className="inline-flex size-8 items-center justify-center rounded-full transition-colors hover:text-gold"
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            aria-label={`Increase quantity of ${item.name}`}
                            className="inline-flex size-8 items-center justify-center rounded-full transition-colors hover:text-gold"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-offwhite/60">Qty {item.quantity}</span>
                      )}
                      <span className="font-display text-2xl leading-none text-gold">
                        {formatRand(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="border-t border-white/10 px-6 py-6">
              <div className="flex items-baseline justify-between">
                <span className="text-sm uppercase tracking-[0.2em] text-offwhite/60">Subtotal</span>
                <span className="font-display text-4xl leading-none text-gold">{formatRand(subtotal)}</span>
              </div>

              {step === "cart" ? (
                <>
                  <p className="mt-2 text-xs text-offwhite/40">We&apos;ll confirm delivery or collection on WhatsApp.</p>
                  <button
                    type="button"
                    onClick={() => setStep("details")}
                    className="btn-luxe mt-5 flex w-full items-center justify-center gap-2.5 rounded-full bg-gold px-6 py-4 font-semibold text-charcoal hover:bg-gold-light"
                  >
                    Checkout
                  </button>
                </>
              ) : (
                <form onSubmit={handleCheckout} className="mt-5 space-y-3">
                  <div>
                    <label htmlFor="checkout-name" className="text-xs font-medium uppercase tracking-[0.15em] text-offwhite/60">
                      Your name
                    </label>
                    <input
                      id="checkout-name"
                      name="name"
                      required
                      minLength={2}
                      maxLength={80}
                      autoComplete="name"
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-charcoal-soft px-4 py-3 text-offwhite placeholder:text-offwhite/30 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/20"
                      placeholder="e.g. Sipho Dlamini"
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout-phone" className="text-xs font-medium uppercase tracking-[0.15em] text-offwhite/60">
                      Phone / WhatsApp number
                    </label>
                    <input
                      id="checkout-phone"
                      name="phone"
                      type="tel"
                      required
                      autoComplete="tel"
                      inputMode="tel"
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-charcoal-soft px-4 py-3 text-offwhite placeholder:text-offwhite/30 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/20"
                      placeholder="e.g. 071 234 5678"
                    />
                  </div>

                  {error && (
                    <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      <AlertCircle className="mt-0.5 size-4 shrink-0" />
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={pending}
                    className="btn-luxe flex w-full items-center justify-center gap-2.5 rounded-full bg-gold px-6 py-4 font-semibold text-charcoal hover:bg-gold-light disabled:cursor-wait disabled:opacity-70"
                  >
                    {pending ? <Loader2 className="size-5 animate-spin" /> : <WhatsAppIcon className="size-5" />}
                    {pending ? "Placing order…" : "Place Order"}
                  </button>
                  <p className="text-center text-xs text-offwhite/40">
                    Your order is saved, then WhatsApp opens so you can send us the details.
                  </p>
                </form>
              )}
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}

function EmptyCart({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <div className="flex size-20 items-center justify-center rounded-full border border-gold/40 text-gold">
        <ShoppingBag className="size-8" strokeWidth={1.5} />
      </div>
      <p className="mt-6 font-display text-3xl tracking-wide">Your cart is empty</p>
      <p className="mt-2 text-sm text-offwhite/60">Browse the shop and add something you like.</p>
      <Link
        href="/shop"
        onClick={onClose}
        className="mt-8 rounded-full border border-gold px-7 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-gold transition-colors hover:bg-gold hover:text-charcoal"
      >
        Go to Shop
      </Link>
    </div>
  );
}

function OrderConfirmation({ order, onClose }: { order: PlacedOrder; onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-6 py-10">
      <div className="text-center">
        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-gold/10 text-gold">
          <CheckCircle2 className="size-10" strokeWidth={1.5} />
        </div>
        <p className="mt-6 font-display text-4xl tracking-wide">Thank you, {order.customerName.split(" ")[0]}!</p>
        <p className="mt-2 text-sm text-offwhite/60">
          Order <span className="font-semibold text-gold">#{order.orderRef}</span> has been received.
        </p>
      </div>

      <ul className="mt-8 divide-y divide-white/10 rounded-2xl border border-white/10 px-5">
        {order.items.map((line) => (
          <li key={line.product_id} className="flex justify-between gap-4 py-3 text-sm">
            <span className="text-offwhite/80">
              {line.quantity} × {line.name}
            </span>
            <span className="text-offwhite">{formatRand(line.line_total)}</span>
          </li>
        ))}
        <li className="flex items-baseline justify-between py-3">
          <span className="text-xs uppercase tracking-[0.2em] text-offwhite/60">Subtotal</span>
          <span className="font-display text-3xl leading-none text-gold">{formatRand(order.subtotal)}</span>
        </li>
      </ul>

      <p className="mt-6 text-center text-sm text-offwhite/60">
        Send us the order on WhatsApp so we can confirm delivery or collection.
      </p>
      <a
        href={whatsappOrderUrl(order)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-full bg-[#25D366] px-6 py-4 font-semibold text-white transition-opacity hover:opacity-90"
      >
        <WhatsAppIcon className="size-5" />
        Send Order on WhatsApp
      </a>
      <button
        type="button"
        onClick={onClose}
        className="mt-3 w-full rounded-full px-6 py-3 text-sm font-medium text-offwhite/60 transition-colors hover:text-offwhite"
      >
        Continue browsing
      </button>
    </div>
  );
}
