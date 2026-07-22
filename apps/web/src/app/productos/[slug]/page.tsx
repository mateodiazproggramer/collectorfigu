import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProduct, getProductReviews, getProducts } from '@/lib/api';
import { ProductDetailExperience } from '@/components/product-detail-experience';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);
  if (!product) return { title: 'Producto no disponible' };
  const generalImages = (product.images ?? []).filter((entry: any) => !entry.variantId);
  const image = generalImages.find((entry: any) => entry.isMain)?.url ?? generalImages[0]?.url ?? product.images?.[0]?.url;
  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `/productos/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.description,
      images: image ? [image] : ['/brand/collectorfigu-logo.png'],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.description,
      images: image ? [image] : ['/brand/collectorfigu-logo.png'],
    },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => notFound());
  const reviews = await getProductReviews(product.id);
  const accessoryGroups = await Promise.all([
    getProducts({ category: 'Llaveros', available: true, limit: 16 }).catch(() => ({ items: [] })),
    getProducts({ brand: product.brand?.name, available: true, limit: 12 }).catch(() => ({ items: [] })),
    getProducts({ category: 'Funkos & Sets', available: true, limit: 8 }).catch(() => ({ items: [] })),
  ]);
  const accessoryCandidates = Array.from(
    new Map(accessoryGroups.flatMap((group) => group.items ?? []).filter((item) => item.id !== product.id).map((item) => [item.id, item])).values(),
  );
  const cheaperAlternativesResult = product.brand?.name
    ? await getProducts({
        brand: product.brand.name,
        category: product.category?.name,
        available: true,
        maxPrice: Math.max(0, Number(product.price) - 1),
        sort: 'price_desc',
        limit: 8,
      }).catch(() => ({ items: [] }))
    : { items: [] };
  const cheaperAlternatives = (cheaperAlternativesResult.items ?? []).filter((item: any) => item.id !== product.id);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://collectorfigu.com';
  const generalImages = (product.images ?? []).filter((entry: any) => !entry.variantId);
  const image = generalImages.find((entry: any) => entry.isMain)?.url ?? generalImages[0]?.url ?? product.images?.[0]?.url;
  const stock = Math.max(0, Number(product.inventory?.stock ?? 0) - Number(product.inventory?.reserved ?? 0));
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: image ? [image] : undefined,
    description: product.description,
    sku: product.sku,
    brand: product.brand?.name ? { '@type': 'Brand', name: product.brand.name } : undefined,
    category: product.category?.name,
    offers: {
      '@type': 'Offer',
      url: `${baseUrl}/productos/${product.slug}`,
      priceCurrency: 'COP',
      price: Number(product.price ?? 0),
      availability: stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <section className="border-b border-slate-200 bg-white">
        <div className="container-page flex flex-wrap items-center gap-2 py-4 text-sm font-semibold text-slate-500">
          <Link href="/" className="hover:text-brand-blue">Inicio</Link>
          <span>/</span>
          <Link href="/productos" className="hover:text-brand-blue">Catalogo</Link>
          <span>/</span>
          <span className="text-slate-900">{product.name}</span>
        </div>
      </section>

      <ProductDetailExperience product={product} accessoryCandidates={accessoryCandidates} cheaperAlternatives={cheaperAlternatives} reviews={reviews} />
    </main>
  );
}
