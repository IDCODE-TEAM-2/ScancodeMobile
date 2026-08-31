import React, { createContext, useCallback, useContext, useState } from 'react';
import type { CartItem, Product } from '../types';

// Cart and favorites are keyed by storefrontId so a customer who scans
// two different stores in the same session doesn't see one store's cart
// bleed into the other's.
interface CartContextValue {
  carts: Record<number, CartItem[]>;
  favorites: Record<number, Product[]>;
  addToCart: (storefrontId: number, product: Product) => boolean;
  updateCartQty: (storefrontId: number, id: string, delta: number) => void;
  removeCartItem: (storefrontId: number, id: string) => void;
  clearCart: (storefrontId: number) => void;
  toggleFavorite: (storefrontId: number, product: Product) => void;
}

export const EMPTY_CART: CartItem[] = [];
export const EMPTY_FAVORITES: Product[] = [];

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [carts, setCarts] = useState<Record<number, CartItem[]>>({});
  const [favorites, setFavorites] = useState<Record<number, Product[]>>({});

  const addToCart = useCallback((storefrontId: number, product: Product): boolean => {
    let added = true;
    setCarts((prev) => {
      const current = prev[storefrontId] ?? EMPTY_CART;
      const existing = current.find((item) => item.id === product.id);
      const currentQty = existing ? existing.qty : 0;
      if (currentQty + 1 > product.stock) {
        added = false;
        return prev;
      }
      const nextItems = existing
        ? current.map((item) => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item))
        : [...current, { id: product.id, name: product.name, price: product.price, qty: 1, stock: product.stock }];
      return { ...prev, [storefrontId]: nextItems };
    });
    return added;
  }, []);

  const updateCartQty = useCallback((storefrontId: number, id: string, delta: number) => {
    setCarts((prev) => {
      const current = prev[storefrontId] ?? EMPTY_CART;
      const next = current
        .map((item) => {
          if (item.id !== id) return item;
          const newQty = item.qty + delta;
          if (newQty <= 0) return null;
          if (item.stock !== undefined && newQty > item.stock) return item;
          return { ...item, qty: newQty };
        })
        .filter((item): item is CartItem => item !== null);
      return { ...prev, [storefrontId]: next };
    });
  }, []);

  const removeCartItem = useCallback((storefrontId: number, id: string) => {
    setCarts((prev) => ({
      ...prev,
      [storefrontId]: (prev[storefrontId] ?? EMPTY_CART).filter((item) => item.id !== id),
    }));
  }, []);

  const clearCart = useCallback((storefrontId: number) => {
    setCarts((prev) => ({ ...prev, [storefrontId]: [] }));
  }, []);

  const toggleFavorite = useCallback((storefrontId: number, product: Product) => {
    setFavorites((prev) => {
      const current = prev[storefrontId] ?? EMPTY_FAVORITES;
      const next = current.some((p) => p.id === product.id)
        ? current.filter((p) => p.id !== product.id)
        : [...current, product];
      return { ...prev, [storefrontId]: next };
    });
  }, []);

  return (
    <CartContext.Provider
      value={{ carts, favorites, addToCart, updateCartQty, removeCartItem, clearCart, toggleFavorite }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
