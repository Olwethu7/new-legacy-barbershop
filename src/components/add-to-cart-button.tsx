"use client";

import { useEffect, useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import { useCart, type CartItem } from "@/context/cart-context";

type Props = {
  product: Omit<CartItem, "quantity">;
  disabled?: boolean;
};

export function AddToCartButton({ product, disabled }: Props) {
  const { addItem, openCart } = useCart();
  const [added, setAdded] = useState(false);

  // Reset the "Added" state after a moment.
  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1500);
    return () => clearTimeout(t);
  }, [added]);

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-full border border-charcoal/15 px-5 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-charcoal/40"
      >
        Sold Out
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        addItem(product);
        setAdded(true);
        openCart();
      }}
      className={`flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.15em] transition-colors ${
        added ? "bg-gold text-charcoal" : "bg-charcoal text-offwhite hover:bg-gold hover:text-charcoal"
      }`}
    >
      {added ? <Check className="size-4" /> : <ShoppingBag className="size-4" />}
      {added ? "Added" : "Add to Cart"}
    </button>
  );
}
