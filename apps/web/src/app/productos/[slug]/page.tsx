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
  // Trae hasta 100 productos de la misma categoria: alimenta tanto la seccion "Todas las {categoria}"
  // (muestra los primeros 12 + link al catalogo completo) como las recomendaciones del modal de
  // "Realizar pedido", que ahora muestra la lista completa de la categoria en vez de unas pocas.
  const sameCategoryResult = product.category?.name
    ? await getProducts({ category: product.category.name, available: true, limit: 100 }).catch(() => ({ items: [], meta: { total: 0 } }))
    : { items: [], meta: { total: 0 } };
  const sameCategoryProducts = (sameCategoryResult.items ?? []).filter((item: any) => item.id !== product.id).slice(0, 100);
  const sameCategoryTotal = Math.max(0, (sameCategoryResult.meta?.total ?? sameCategoryProducts.length) - 1);
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
      <section className="border-b border-brand-line bg-white">
        <div className="container-page flex flex-wrap items-center gap-2 py-4 text-sm font-semibold text-brand-inkSoft">
          <Link href="/" className="hover:text-brand-blue">Inicio</Link>
          <span>/</span>
          <Link href="/productos" className="hover:text-brand-blue">Catalogo</Link>
          <span>/</span>
          <span className="text-brand-ink">{product.name}</span>
        </div>
      </section>

      <ProductDetailExperience product={product} sameCategoryProducts={sameCategoryProducts} sameCategoryTotal={sameCategoryTotal} reviews={reviews} />
    </main>
  );
}
