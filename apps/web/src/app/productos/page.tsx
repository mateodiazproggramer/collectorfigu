import Link from 'next/link';
import type { Metadata } from 'next';
import { Filter, Search, SlidersHorizontal, Star } from 'lucide-react';
import { ProductGrid } from '@/components/product-grid';
import { TrustStrip } from '@/components/trust-strip';
import { WhatsAppIcon } from '@/components/whatsapp-icon';
import { getCatalogOptions, getProducts } from '@/lib/api';
import { brandFilters, budgetRanges, shoppingNeeds } from '@/lib/merchandising';
import { salesWhatsAppUrl } from '@/lib/whatsapp';

const pieceOptions = [40, 100, 120, 200, 300, 500];
const pageSize = 24;

export const metadata: Metadata = {
  title: 'Catálogo: minifiguras, cuadros personalizados, llaveros y sets',
  description: 'Minifiguras únicas, cuadros personalizados, llaveros y Funkos & Sets de anime, superheroes, peliculas, series y gaming, con precio claro, disponibilidad y pago seguro por Wompi.',
  alternates: { canonical: '/productos' },
};

function categoryHref(name: string) {
  return `/productos?${new URLSearchParams({ category: name }).toString()}`;
}

function productsHref(params: Record<string, string>, updates: Record<string, string | number | undefined>) {
  const next = new URLSearchParams();
  Object.entries({ ...params, ...updates, limit: undefined }).forEach(([key, value]) => {
    if (value !== undefined && value !== '') next.set(key, String(value));
  });
  const query = next.toString();
  return `/productos${query ? `?${query}` : ''}`;
}

function HiddenParams({ params, exclude = [] }: { params: Record<string, string>; exclude?: string[] }) {
  return (
    <>
      {Object.entries(params)
        .filter(([key, value]) => value && !exclude.includes(key))
        .map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
    </>
  );
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const normalizedParams = Object.fromEntries(Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value ?? '']));
  const productParams = { ...normalizedParams, limit: String(pageSize), sort: normalizedParams.sort || 'smart' };
  const [products, catalogOptions] = await Promise.all([getProducts(productParams), getCatalogOptions()]);
  const dynamicBrands = catalogOptions.brands.map((brand) => brand.name);
  const brands = dynamicBrands.length ? dynamicBrands : brandFilters;
  const categories = catalogOptions.categories.map((category) => category.name);
  const currentPage = Number(products.meta?.page ?? normalizedParams.page ?? 1);
  const totalPages = Math.max(1, Number(products.meta?.pages ?? 1));
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1).filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1);

  return (
    <main>
      <section className="bg-brand-dark bg-brand-radial text-white">
        <div className="container-page py-8 md:py-14">
          <p className="badge-brand">Catalogo CollectorFigu</p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_420px] lg:items-end">
            <div>
              <h1 className="text-3xl font-black tracking-tight md:text-6xl">Tu personaje favorito, en la línea que prefieras</h1>
              <p className="mt-3 max-w-2xl text-sm text-white/60 md:mt-4 md:text-base">Minifiguras, cuadros personalizados, llaveros y sets. Busca por franquicia, personaje, línea y disponibilidad.</p>
            </div>
            <form action="/productos" className="grid gap-2 rounded-[1.5rem] border border-white/10 bg-white/10 p-2 backdrop-blur-xl sm:flex">
              <label className="relative block flex-1">
                <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-cyan" />
                <input
                  name="q"
                  defaultValue={normalizedParams.q ?? ''}
                  className="h-12 w-full rounded-2xl bg-transparent pl-11 pr-4 text-sm font-semibold text-white outline-none placeholder:text-white/40"
                  placeholder="Goku, Marvel, set de regalo..."
                />
              </label>
              <button className="min-h-12 rounded-2xl bg-white px-4 text-sm font-black text-brand-dark sm:ml-2" type="submit">Buscar</button>
            </form>
          </div>
          <div className="mt-5 flex flex-wrap items-start gap-2 md:mt-8 md:gap-3">
            <Link href="/" className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-bold text-white/70 transition hover:border-brand-cyan/50 hover:text-brand-cyan">
              Inicio
            </Link>
            <details className="group relative">
              <summary className="cursor-pointer list-none rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-bold text-white/70 transition marker:hidden hover:border-brand-cyan/50 hover:text-brand-cyan">
                Categorias
              </summary>
              <div className="absolute left-0 z-20 mt-2 w-72 overflow-hidden rounded-2xl border border-white/10 bg-brand-dark shadow-[0_18px_45px_rgba(0,0,0,.35)]">
                <div className="grid max-h-80 gap-1 overflow-y-auto p-2">
                  {categories.map((category) => (
                    <Link key={category} href={categoryHref(category)} className="rounded-xl px-3 py-2 text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-brand-cyan">
                      {category}
                    </Link>
                  ))}
                </div>
              </div>
            </details>
          </div>
        </div>
      </section>

      <TrustStrip />

      <section className="container-page grid gap-4 py-4 lg:grid-cols-[320px_1fr] lg:gap-8 lg:py-10">
        <aside className="card hidden h-fit overflow-hidden lg:sticky lg:top-28 lg:block lg:max-h-[calc(100dvh-8rem)]">
          <div className="border-b border-brand-line bg-brand-paper2 p-5">
            <div className="flex items-center gap-2 text-brand-dark">
              <Filter size={18} className="text-brand-blue" />
              <h2 className="font-black">Filtros</h2>
            </div>
            <p className="mt-2 text-xs leading-5 text-brand-inkSoft">Combina busqueda, categoria, precio y memoria sin perder el contexto del listado.</p>
          </div>

          <form action="/productos" className="grid gap-4 p-5 pb-0 lg:max-h-[calc(100dvh-15rem)] lg:overflow-y-auto">
            <HiddenParams params={normalizedParams} exclude={['q', 'brand', 'category', 'character', 'isLimitedEdition', 'available', 'minPrice', 'maxPrice', 'pieces', 'page']} />

            <label className="grid gap-2 text-sm font-bold text-brand-inkSoft">
              Buscar
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-inkSoft/70" />
                <input name="q" defaultValue={normalizedParams.q ?? ''} className="input-brand pl-10" placeholder="Goku, Marvel, personaje..." />
              </div>
            </label>

            <label className="grid gap-2 text-sm font-bold text-brand-inkSoft">
              Franquicia
              <select name="brand" defaultValue={normalizedParams.brand ?? ''} className="input-brand">
                <option value="">Todas</option>
                {brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-bold text-brand-inkSoft">
              Línea de producto
              <select name="category" defaultValue={normalizedParams.category ?? ''} className="input-brand">
                <option value="">Todas</option>
                {(categories.length ? categories : ['Minifiguras únicas', 'Cuadros personalizados', 'Llaveros', 'Funkos & Sets']).map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2 text-sm font-bold text-brand-inkSoft">
                Edicion
                <select name="isLimitedEdition" defaultValue={normalizedParams.isLimitedEdition ?? ''} className="input-brand">
                  <option value="">Todas</option>
                  <option value="true">Edicion limitada</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold text-brand-inkSoft">
                Existencias
                <select name="available" defaultValue={normalizedParams.available ?? ''} className="input-brand">
                  <option value="">Todos</option>
                  <option value="true">Disponible</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2 text-sm font-bold text-brand-inkSoft">
                Precio min.
                <input name="minPrice" type="number" min="0" defaultValue={normalizedParams.minPrice ?? ''} className="input-brand" placeholder="$" />
              </label>
              <label className="grid gap-2 text-sm font-bold text-brand-inkSoft">
                Precio max.
                <input name="maxPrice" type="number" min="0" defaultValue={normalizedParams.maxPrice ?? ''} className="input-brand" placeholder="$" />
              </label>
            </div>

            <fieldset>
              <legend className="mb-3 text-sm font-black text-brand-ink">Piezas</legend>
              <div className="grid grid-cols-2 gap-2">
                {pieceOptions.map((value) => (
                  <label key={value} className="rounded-2xl border border-brand-line px-3 py-2 text-sm font-semibold text-brand-inkSoft transition hover:border-brand-blue/30 hover:bg-brand-blue/5">
                    <input type="radio" name="pieces" value={value} defaultChecked={normalizedParams.pieces === String(value)} className="mr-2 accent-brand-blue" />{value}+
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="sticky bottom-0 -mx-5 mt-1 grid gap-3 border-t border-brand-line bg-white p-5">
              <button className="btn-primary w-full" type="submit"><SlidersHorizontal size={17} className="mr-2" /> Aplicar filtros</button>
              <Link href="/productos" className="text-center text-sm font-black text-brand-inkSoft transition hover:text-brand-blue">Limpiar filtros</Link>
            </div>
          </form>
        </aside>

        <div>
          <details className="card mb-5 overflow-hidden lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between bg-brand-paper2 p-4 font-black text-brand-dark marker:hidden">
              <span className="inline-flex items-center gap-2"><Filter size={18} className="text-brand-blue" /> Filtros</span>
              <span className="text-xs font-black uppercase tracking-[0.14em] text-brand-blue">Abrir</span>
            </summary>
            <form action="/productos" className="grid gap-4 p-4">
              <HiddenParams params={normalizedParams} exclude={['q', 'brand', 'category', 'isLimitedEdition', 'available', 'minPrice', 'maxPrice', 'pieces', 'page']} />
              <label className="grid gap-2 text-sm font-bold text-brand-inkSoft">
                Buscar
                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-inkSoft/70" />
                  <input name="q" defaultValue={normalizedParams.q ?? ''} className="input-brand pl-10" placeholder="Personaje, franquicia, set..." />
                </div>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-brand-inkSoft">
                  Franquicia
                  <select name="brand" defaultValue={normalizedParams.brand ?? ''} className="input-brand">
                    <option value="">Todas</option>
                    {brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-bold text-brand-inkSoft">
                  Línea de producto
                  <select name="category" defaultValue={normalizedParams.category ?? ''} className="input-brand">
                    <option value="">Todas</option>
                    {(categories.length ? categories : ['Minifiguras únicas', 'Cuadros personalizados', 'Llaveros', 'Funkos & Sets']).map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-brand-inkSoft">
                  Precio min.
                  <input name="minPrice" type="number" min="0" defaultValue={normalizedParams.minPrice ?? ''} className="input-brand" placeholder="$" />
                </label>
                <label className="grid gap-2 text-sm font-bold text-brand-inkSoft">
                  Precio max.
                  <input name="maxPrice" type="number" min="0" defaultValue={normalizedParams.maxPrice ?? ''} className="input-brand" placeholder="$" />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-brand-inkSoft">
                  Edicion
                  <select name="isLimitedEdition" defaultValue={normalizedParams.isLimitedEdition ?? ''} className="input-brand">
                    <option value="">Todas</option>
                    <option value="true">Edicion limitada</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-bold text-brand-inkSoft">
                  Existencias
                  <select name="available" defaultValue={normalizedParams.available ?? ''} className="input-brand">
                    <option value="">Todos</option>
                    <option value="true">Disponible</option>
                  </select>
                </label>
              </div>
              <button className="btn-primary w-full" type="submit"><SlidersHorizontal size={17} className="mr-2" /> Aplicar filtros</button>
              <Link href="/productos" className="text-center text-sm font-black text-brand-inkSoft">Limpiar filtros</Link>
            </form>
          </details>

          <div className="mb-4 grid min-w-0 gap-3 rounded-[1.25rem] border border-brand-line bg-white p-3 shadow-soft sm:rounded-[2rem] sm:p-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-sm font-semibold text-brand-inkSoft">{products.meta?.total ?? products.items?.length ?? 0} productos encontrados</p>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0">
                {budgetRanges.slice(0, 3).map((range) => <Link key={range.label} href={range.href} className="rounded-full bg-brand-paper2 px-3 py-1.5 text-xs font-bold text-brand-inkSoft hover:text-brand-blue">{range.label}</Link>)}
              </div>
            </div>
            <form action="/productos" className="grid gap-2 sm:flex sm:items-end">
              <HiddenParams params={normalizedParams} exclude={['sort', 'page']} />
              <label className="grid gap-1 text-xs font-black uppercase tracking-[0.13em] text-brand-inkSoft">
                Ordenar
                <select name="sort" defaultValue={normalizedParams.sort ?? ''} className="input-brand w-full normal-case tracking-normal sm:min-w-48">
                  <option value="">Recomendado</option>
                  <option value="price_asc">Menor precio</option>
                  <option value="price_desc">Mayor precio</option>
                  <option value="discount">Mayor descuento</option>
                </select>
              </label>
              <button className="btn-light h-12 px-4" type="submit">Ordenar</button>
            </form>
          </div>

          <div className="mb-5 hidden min-w-0 rounded-[1.5rem] border border-brand-line bg-white p-4 shadow-soft sm:rounded-[2rem] lg:block">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-blue">Compra por franquicia</p>
                <p className="mt-1 text-sm font-semibold text-brand-inkSoft">Filtra rapido sin perder los demas criterios.</p>
              </div>
              <Link href={productsHref(normalizedParams, { brand: undefined, page: undefined })} className={`self-start rounded-full border px-4 py-2 text-xs font-black transition ${normalizedParams.brand ? 'border-brand-line bg-white text-brand-inkSoft hover:border-brand-blue/40 hover:text-brand-blue' : 'border-brand-blue bg-brand-blue text-white'}`}>
                Todas
              </Link>
            </div>
            <div className="mt-4 flex min-w-0 flex-wrap gap-2">
              {brands.map((brand) => {
                const active = normalizedParams.brand === brand;
                return (
                  <Link key={brand} href={productsHref(normalizedParams, { brand, page: undefined })} className={`max-w-full rounded-full border px-4 py-2 text-xs font-black transition ${active ? 'border-brand-blue bg-brand-blue text-white' : 'border-brand-line bg-brand-paper2 text-brand-inkSoft hover:border-brand-blue/40 hover:text-brand-blue'}`}>
                    {brand}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mb-8 hidden min-w-0 gap-4 md:grid md:grid-cols-3">
            {shoppingNeeds.slice(0, 3).map((need) => {
              const Icon = need.icon;
              return (
                <Link href={need.href} key={need.label} className="min-w-0 rounded-[1.5rem] border border-brand-line bg-white p-5 shadow-soft transition hover:-translate-y-1 hover:border-brand-blue/30 sm:rounded-3xl">
                  <div className="flex items-center justify-between">
                    <Icon size={22} className="text-brand-blue" />
                    <span className="rounded-full bg-brand-gold/15 px-2 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-brand-gold"><Star size={11} className="mr-1 inline" /> Top</span>
                  </div>
                  <p className="mt-4 font-black text-brand-ink">{need.label}</p>
                  <p className="mt-1 text-xs text-brand-inkSoft">{need.description}</p>
                </Link>
              );
            })}
          </div>

          <ProductGrid products={products.items} />
          {totalPages > 1 ? (
            <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Paginacion de productos">
              <Link href={productsHref(normalizedParams, { page: Math.max(1, currentPage - 1) })} className={`rounded-2xl border px-4 py-2 text-sm font-black ${currentPage <= 1 ? 'pointer-events-none border-brand-line text-brand-inkSoft/40' : 'border-brand-line text-brand-inkSoft hover:border-brand-blue hover:text-brand-blue'}`}>
                Anterior
              </Link>
              {pageNumbers.map((page, index) => {
                const previous = pageNumbers[index - 1];
                return (
                  <span key={page} className="inline-flex items-center gap-2">
                    {previous && page - previous > 1 ? <span className="px-1 text-sm font-black text-brand-inkSoft/40">...</span> : null}
                    <Link href={productsHref(normalizedParams, { page })} className={`grid h-10 min-w-10 place-items-center rounded-2xl border px-3 text-sm font-black ${page === currentPage ? 'border-brand-blue bg-brand-blue text-white' : 'border-brand-line text-brand-inkSoft hover:border-brand-blue hover:text-brand-blue'}`}>
                      {page}
                    </Link>
                  </span>
                );
              })}
              <Link href={productsHref(normalizedParams, { page: Math.min(totalPages, currentPage + 1) })} className={`rounded-2xl border px-4 py-2 text-sm font-black ${currentPage >= totalPages ? 'pointer-events-none border-brand-line text-brand-inkSoft/40' : 'border-brand-line text-brand-inkSoft hover:border-brand-blue hover:text-brand-blue'}`}>
                Siguiente
              </Link>
            </nav>
          ) : null}
          {products.unavailable ? (
            <div className="mt-6 rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-800">
              No pudimos cargar los productos en este momento. Escríbenos por WhatsApp para recibir asesoría.
            </div>
          ) : null}

          <div className="mt-10 rounded-[2rem] bg-brand-dark bg-brand-radial p-6 text-white shadow-glow md:flex md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-cyan">Compra omnicanal</p>
              <h2 className="mt-2 text-2xl font-black">Quieres ver fotos reales antes de comprar?</h2>
              <p className="mt-2 text-sm text-white/60">Solicita fotos reales, confirma disponibilidad o pide un set personalizado por WhatsApp.</p>
            </div>
            <a href={salesWhatsAppUrl('Catalogo de productos')} target="_blank" rel="noreferrer" className="btn-primary mt-5 md:mt-0"><WhatsAppIcon size={18} className="mr-2" /> Hablar con asesor</a>
          </div>
        </div>
      </section>
    </main>
  );
}
