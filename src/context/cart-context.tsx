"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from "react";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
};

const STORAGE_KEY = "new-legacy-cart";
const MAX_QUANTITY = 99;
const EMPTY: CartItem[] = [];

// ---- Cart store backed by localStorage ----
// Kept outside React so every component reads the same cart, and so the server
// render (empty cart) and the browser render (saved cart) never clash.

let cart: CartItem[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function isCartItem(value: unknown): value is CartItem {
  const v = value as CartItem;
  return (
    typeof v === "object" &&
    v !== null &&
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.price === "number" &&
    typeof v.quantity === "number" &&
    v.quantity > 0
  );
}

function readStorage(): CartItem[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isCartItem) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function ensureLoaded() {
  if (!loaded && typeof window !== "undefined") {
    cart = readStorage();
    loaded = true;
  }
}

function setCart(next: CartItem[]) {
  cart = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked (e.g. private mode): the cart still works for this visit.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  ensureLoaded();
  listeners.add(listener);

  // Keep carts in sync across open tabs.
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cart = readStorage();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  ensureLoaded();
  return cart;
}

function getServerSnapshot() {
  return EMPTY;
}

// ---- React context ----

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = useCallback<CartContextValue["addItem"]>((item, quantity = 1) => {
    const existing = cart.find((i) => i.id === item.id);
    setCart(
      existing
        ? cart.map((i) =>
            i.id === item.id ? { ...i, quantity: Math.min(i.quantity + quantity, MAX_QUANTITY) } : i,
          )
        : [...cart, { ...item, quantity: Math.min(quantity, MAX_QUANTITY) }],
    );
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setCart(
      quantity <= 0
        ? cart.filter((i) => i.id !== id)
        : cart.map((i) => (i.id === id ? { ...i, quantity: Math.min(quantity, MAX_QUANTITY) } : i)),
    );
  }, []);

  const removeItem = useCallback((id: string) => setCart(cart.filter((i) => i.id !== id)), []);
  const clearCart = useCallback(() => setCart([]), []);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return { items, itemCount, subtotal, addItem, updateQuantity, removeItem, clearCart, isOpen, openCart, closeCart };
  }, [items, isOpen, addItem, updateQuantity, removeItem, clearCart, openCart, closeCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
