'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, ShoppingCart } from 'lucide-react';
import { addCartItem, CartProduct, toggleFavorite } from '@/lib/cart-store';
import { productMetaPayload, trackMetaPixel } from '@/lib/meta-pixel';

export function ProductActions({ product }: { product: CartProduct }) {
  const [added, setAdded] = useState(false);
  const [saved, setSaved] = useState(false);
  const stock = product.inventory?.stock ?? 0;

  function add() {
    if (stock <= 0) return;
    addCartItem(product, 1);
    trackMetaPixel('AddToCart', productMetaPayload(product, undefined, 1));
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  }

  function save() {
    setSaved(toggleFavorite(product));
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button className="btn-primary w-full" onClick={add} disabled={stock <= 0}>
          <ShoppingCart size={18} className="mr-2" /> {stock <= 0 ? 'Sin existencias' : added ? 'Agregado' : 'Agregar al carrito'}
        </button>
        <button className="btn-light w-full" onClick={save}>
          <Heart size={18} className="mr-2" /> {saved ? 'Guardado' : 'Guardar'}
        </button>
      </div>
      {added ? (
        <div className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
          Producto agregado. <Link href="/carrito" className="underline">Ver carrito</Link>
        </div>
      ) : null}
    </div>
  );
}
