'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/lib/cart-store';

export function CartLink() {
  const { count } = useCart();
  return (
    <Link href="/carrito" className="relative rounded-2xl bg-gradient-to-r from-brand-blue to-brand-cyan p-3 text-white shadow-glow transition duration-300 hover:-translate-y-0.5 hover:scale-105 hover:shadow-[0_18px_38px_-10px_rgba(109,59,245,.55)] active:translate-y-0 active:scale-100" aria-label="Ver carrito">
      <ShoppingCart size={20} />
      <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[11px] font-black text-brand-blue">{count}</span>
    </Link>
  );
}
