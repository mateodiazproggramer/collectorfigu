'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/lib/cart-store';

export function CartLink() {
  const { count } = useCart();
  return (
    <Link href="/carrito" className="relative rounded-2xl bg-gradient-to-r from-brand-blue to-brand-cyan p-3 text-white shadow-glow" aria-label="Ver carrito">
      <ShoppingCart size={20} />
      <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[11px] font-black text-brand-blue">{count}</span>
    </Link>
  );
}
