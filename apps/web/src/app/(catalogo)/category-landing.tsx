import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ProductGrid } from '@/components/product-grid';
import { getCatalogOptions, getProducts } from '@/lib/api';

type CategoryLandingProps = {
  eyebrow: string;
  title: string;
  description: string;
  /** Franquicias (brands) que agrupa esta landing, ej. ['Dragon Ball', 'Naruto'] */
  brands: string[];
  fallbackHref?: string;
};

export async function CategoryLanding({ eyebrow, title, description, brands, fallbackHref }: CategoryLandingProps) {
  const brandsParam = brands.join(',');
  const [products, catalogOptions] = await Promise.all([
    getProducts({ brands: brandsParam, available: true, limit: 24, sort: 'smart' }),
    getCatalogOptions(),
  ]);
  const categoryHref = fallbackHref ?? `/productos?brands=${encodeURIComponent(brandsParam)}`;
  const relevantBrands = catalogOptions.brands.filter((brand) => brands.includes(brand.name));

  return (
    <main>
      <section className="bg-brand-dark bg-brand-radial text-white">
        <div className="container-page py-10 md:py-14">
          <p className="badge-brand">{eyebrow}</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-white/65">{description}</p>
          <Link href={categoryHref} className="btn-primary mt-6">
            Ver todo el catalogo <ArrowRight size={18} className="ml-2" />
          </Link>

          {relevantBrands.length ? (
            <div className="mt-8">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/50">Filtrar por franquicia</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {relevantBrands.map((brand) => (
                  <Link key={brand.id} href={`/productos?brand=${encodeURIComponent(brand.name)}`} className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-bold text-white/75 transition hover:border-brand-cyan/50 hover:text-brand-cyan">
                    {brand.name}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
      <section className="container-page py-8 md:py-10">
        <ProductGrid products={products.items ?? []} />
      </section>
    </main>
  );
}
