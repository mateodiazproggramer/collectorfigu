'use client';

import Link from 'next/link';
import { ChevronDown, Menu, Search, X } from 'lucide-react';
import { useState } from 'react';

type NavItem = {
  href: string;
  label: string;
};

type Category = {
  id: string;
  name: string;
};

function categoryHref(name: string) {
  return `/productos?${new URLSearchParams({ category: name }).toString()}`;
}

export function MobileMenu({ navItems, categories }: { navItems: NavItem[]; categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  function closeMenu() {
    setOpen(false);
    setCategoriesOpen(false);
  }

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="rounded-2xl border border-white/10 p-3 text-white"
        aria-label={open ? 'Cerrar menu' : 'Abrir menu'}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-full border-t border-white/10 bg-brand-dark px-4 py-4 shadow-[0_22px_45px_rgba(0,0,0,.35)] backdrop-blur-xl">
          <form action="/productos" className="mb-4" onSubmit={closeMenu}>
            <label className="relative block">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-cyan" />
              <input
                name="q"
                aria-label="Buscar figuras"
                placeholder="Buscar por personaje, franquicia o set..."
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/10 pl-12 pr-4 text-sm font-semibold text-white outline-none placeholder:text-white/40"
              />
            </label>
          </form>

          <nav className="grid gap-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={closeMenu} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white/80">
                {item.label}
              </Link>
            ))}

            <div>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white/80"
                aria-expanded={categoriesOpen}
                onClick={() => setCategoriesOpen((current) => !current)}
              >
                Categorias
                <ChevronDown size={16} className={`transition ${categoriesOpen ? 'rotate-180' : ''}`} />
              </button>
              {categoriesOpen ? (
                <div className="mt-2 grid max-h-64 gap-1 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.04] p-2">
                  {categories.map((category) => (
                    <Link key={category.id} href={categoryHref(category.name)} onClick={closeMenu} className="rounded-xl px-3 py-2 text-sm font-bold text-white/70 hover:bg-white/10 hover:text-brand-cyan">
                      {category.name}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
