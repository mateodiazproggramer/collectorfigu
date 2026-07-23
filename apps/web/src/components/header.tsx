import Link from 'next/link';
import { Menu, Search, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { CartLink } from '@/components/cart-link';
import { CategoryNavDropdown } from '@/components/category-nav-dropdown';
import { SearchAutocomplete } from '@/components/search-autocomplete';

// Nav principal: las 4 lineas de producto oficiales del manual de marca (CF-02 Que vende).
// Las franquicias (Dragon Ball, Marvel, Star Wars...) quedan como quick-links / filtros dentro de /productos.
const navItems = [
  { href: '/productos?category=' + encodeURIComponent('Minifiguras únicas'), label: 'Minifiguras' },
  { href: '/productos?category=' + encodeURIComponent('Cuadros personalizados'), label: 'Cuadros personalizados' },
  { href: '/productos?category=' + encodeURIComponent('Llaveros'), label: 'Llaveros' },
  { href: '/productos?category=' + encodeURIComponent('Funkos & Sets'), label: 'Funkos & Sets' },
  { href: '/sobre-nosotros', label: 'Nosotros' },
];

const quickLinks = ['Dragon Ball', 'Marvel', 'Star Wars', 'Anime', 'Gaming', 'Deportes'];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-brand-dark/95 text-white shadow-[0_10px_40px_rgba(0,0,0,.25)] backdrop-blur-xl">
      <div className="border-b border-white/5 bg-white/[0.035]">
        <div className="container-page flex items-center justify-center gap-2 py-2 text-center text-xs font-semibold text-white/70 md:justify-between">
          <span className="inline-flex items-center gap-2"><ShieldCheck size={14} className="text-brand-cyan" /> Envíos a toda Colombia · Nuevas figuras cada semana · Compra 100% segura</span>
          <span className="hidden text-white/50 md:inline">CollectorFigu · Bogotá, Colombia</span>
        </div>
      </div>

      <div className="container-page flex min-h-20 items-center justify-between gap-4 py-3">
        <div className="flex items-center gap-4">
          <details className="group md:hidden">
            <summary className="list-none rounded-2xl border border-white/10 p-3 text-white marker:hidden" aria-label="Abrir menú">
              <Menu size={20} />
            </summary>
            <div className="absolute left-0 right-0 top-full border-t border-white/10 bg-brand-dark px-4 py-4 shadow-[0_22px_45px_rgba(0,0,0,.35)] backdrop-blur-xl">
              <form action="/productos" className="mb-4">
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-brand-cyan" />
                  <SearchAutocomplete
                    name="q"
                    ariaLabel="Buscar figuras"
                    placeholder="Buscar por personaje, franquicia o set..."
                    inputClassName="h-12 w-full rounded-2xl border border-white/10 bg-white/10 pl-12 pr-4 text-sm font-semibold text-white outline-none placeholder:text-white/40"
                  />
                </div>
              </form>
              <nav className="grid gap-2">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white/80">
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-4 flex flex-wrap gap-2">
                {quickLinks.slice(0, 5).map((item) => (
                  <Link key={item} href={`/productos?q=${encodeURIComponent(item)}`} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-bold text-white/60">
                    {item}
                  </Link>
                ))}
              </div>
            </div>
          </details>
          <BrandLogo className="h-11 w-auto md:h-12" priority />
        </div>

        <form action="/productos" className="hidden max-w-xl flex-1 lg:block">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-brand-cyan" />
            <SearchAutocomplete
              name="q"
              ariaLabel="Buscar figuras"
              placeholder="Buscar por personaje, franquicia o set..."
              inputClassName="h-12 w-full rounded-2xl border border-white/10 bg-white/10 pl-12 pr-4 text-sm font-medium text-white outline-none transition placeholder:text-white/40 focus:border-brand-cyan/50 focus:bg-white/[0.14]"
            />
          </div>
        </form>

        <div className="flex items-center gap-2">
          <CartLink />
        </div>
      </div>

      <div className="hidden border-t border-white/5 md:block">
        <div className="container-page flex items-center justify-between gap-4 py-3">
          <nav className="flex items-center gap-6 text-sm font-semibold text-white/75">
            <CategoryNavDropdown />
            <Link href="/sobre-nosotros" className="transition hover:text-brand-cyan">Nosotros</Link>
          </nav>
          <div className="hidden items-center gap-2 xl:flex">
            {quickLinks.map((item) => (
              <Link key={item} href={`/productos?q=${encodeURIComponent(item)}`} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-white/60 transition hover:border-brand-cyan/40 hover:text-brand-cyan">
                {item}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
