"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CartItem } from "@/src/types/cart";

const CART_STORAGE_KEY = "drinkeaze-cart";

type NewCartItem = Omit<CartItem, "quantity">;
type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (item: NewCartItem, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function loadFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Discard legacy cart entries that stored a catalog bvid instead of a
    // database ProductVariant ID. They cannot be submitted as valid orders.
    return parsed.filter((item): item is CartItem => {
      return (
        item !== null &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.variantId === "string" &&
        item.id === item.variantId &&
        typeof item.productBvid === "string" &&
        typeof item.name === "string" &&
        typeof item.variantName === "string" &&
        Number.isFinite(item.price) &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0
      );
    });
  } catch {
    return [];
  }
}

function saveToStorage(items: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage can be unavailable in private browsing or when quota is reached.
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(loadFromStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveToStorage(items);
  }, [items, hydrated]);

  const addItem = useCallback((item: NewCartItem, quantity = 1) => {
    const safeQuantity = Math.min(100, Math.max(1, Math.floor(quantity)));
    setItems((previous) => {
      const existing = previous.find((entry) => entry.variantId === item.variantId);
      if (existing) {
        return previous.map((entry) =>
          entry.variantId === item.variantId
            ? { ...entry, quantity: Math.min(100, entry.quantity + safeQuantity) }
            : entry,
        );
      }
      return [...previous, { ...item, quantity: safeQuantity }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity < 1) {
      setItems((previous) => previous.filter((item) => item.id !== id));
      return;
    }
    const safeQuantity = Math.min(100, Math.floor(quantity));
    setItems((previous) =>
      previous.map((item) => (item.id === id ? { ...item, quantity: safeQuantity } : item)),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount,
      subtotal,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    }),
    [items, itemCount, subtotal, addItem, removeItem, updateQuantity, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
