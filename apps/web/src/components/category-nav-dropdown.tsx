'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, LayoutGrid } from 'lucide-react';

const categoryOptions = [
  { label: 'Todas las categorías', href: '/productos' },
  { label: 'Minifiguras', href: `/productos?category=${encodeURIComponent('Minifiguras únicas')}` },
  { label: 'Cuadros personalizados', href: `/productos?category=${encodeURIComponent('Cuadros personalizados')}` },
  { label: 'Llaveros', href: `/productos?category=${encodeURIComponent('Llaveros')}` },
  { label: 'Funkos & Sets', href: `/productos?category=${encodeURIComponent('Funkos & Sets')}` },
];

export function CategoryNavDropdown({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-1.5 font-semibold text-white/75 transition hover:text-brand-cyan"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <LayoutGrid size={16} /> Categorías <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div role="menu" className="absolute left-0 top-full z-40 mt-3 w-64 overflow-hidden rounded-2xl border border-white/10 bg-brand-dark shadow-[0_22px_45px_rgba(0,0,0,.35)]">
          {categoryOptions.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block border-b border-white/5 px-4 py-3 text-sm font-bold text-white/80 transition last:border-0 hover:bg-white/10 hover:text-brand-cyan"
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
