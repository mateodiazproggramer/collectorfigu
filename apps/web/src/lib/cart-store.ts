'use client';

import { useEffect, useMemo, useState } from 'react';

export type CartProduct = {
  id: string;
  slug: string;
  name: string;
  price: number | string;
  previousPrice?: number | string | null;
  character?: string | null;
  presentation?: string | null;
  pieces?: number | null;
  isLimitedEdition?: boolean;
  brand?: { name: string };
  category?: { name?: string | null } | null;
  images?: Array<{ url: string; alt?: string | null }>;
  inventory?: { stock: number; reserved?: number };
  variants?: ProductVariant[];
};

export type ProductVariant = {
  id: string;
  sku?: string | null;
  colorName: string;
  colorHex: string;
  stock: number;
  reserved?: number;
  images?: Array<{ url: string; alt?: string | null }>;
};

export type CartItem = {
  productId: string;
  variantId?: string;
  quantity: number;
  product: CartProduct;
  variant?: ProductVariant;
};

const CART_KEY = 'collectorfigu_cart';
const FAVORITES_KEY = 'collectorfigu_favorites';
const CART_EVENT = 'collectorfigu:cart-updated';
const FAVORITES_EVENT = 'collectorfigu:favorites-updated';

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T, eventName: string) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(eventName));
}

export function getCartItems() {
  return readJson<CartItem[]>(CART_KEY, []);
}

export function setCartItems(items: CartItem[]) {
  writeJson(CART_KEY, items, CART_EVENT);
}

export function addCartItem(product: CartProduct, quantity = 1) {
  return addCartItemVariant(product, undefined, quantity);
}

export function addCartItemVariant(product: CartProduct, variant?: ProductVariant, quantity = 1) {
  const items = getCartItems();
  const existing = items.find((item) => item.productId === product.id && (item.variantId ?? '') === (variant?.id ?? ''));
  const stock = variant ? Math.max(0, variant.stock - (variant.reserved ?? 0)) : product.inventory?.stock ?? 99;
  if (existing) {
    existing.quantity = Math.min(existing.quantity + quantity, stock);
    existing.product = product;
    existing.variant = variant;
  } else {
    items.push({ productId: product.id, variantId: variant?.id, quantity: Math.min(quantity, stock), product, variant });
  }
  setCartItems(items);
}

export function cartLineId(item: Pick<CartItem, 'productId' | 'variantId'>) {
  return `${item.productId}:${item.variantId ?? 'default'}`;
}

export function updateCartItem(lineId: string, quantity: number) {
  const items = getCartItems();
  const next = items
    .map((item) => cartLineId(item) === lineId ? { ...item, quantity: Math.max(1, quantity) } : item)
    .filter((item) => item.quantity > 0);
  setCartItems(next);
}

export function removeCartItem(lineId: string) {
  setCartItems(getCartItems().filter((item) => cartLineId(item) !== lineId));
}

export function clearCart() {
  setCartItems([]);
}

export function toggleFavorite(product: CartProduct) {
  const favorites = readJson<CartProduct[]>(FAVORITES_KEY, []);
  const exists = favorites.some((item) => item.id === product.id);
  const next = exists ? favorites.filter((item) => item.id !== product.id) : [...favorites, product];
  writeJson(FAVORITES_KEY, next, FAVORITES_EVENT);
  return !exists;
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const sync = () => setItems(getCartItems());
    sync();
    window.addEventListener(CART_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CART_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return useMemo(() => ({
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0),
  }), [items]);
}
