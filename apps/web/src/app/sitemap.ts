import type { MetadataRoute } from 'next';
import { getProducts } from '@/lib/api';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const staticPaths = ['', '/productos', '/anime', '/superheroes', '/peliculas-series', '/gaming-deportes', '/sobre-nosotros', '/carrito', '/checkout', '/garantia', '/envios', '/politica-privacidad', '/terminos-condiciones', '/cambios-devoluciones', '/contacto'];
  const staticEntries = staticPaths.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: path === '' ? 1 : 0.8,
  }));
  const products = await getProducts({ limit: 100, available: true }).catch(() => ({ items: [] }));
  const productEntries = (products.items ?? []).map((product: any) => ({
    url: `${base}/productos/${product.slug}`,
    lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }));

  return [...staticEntries, ...productEntries];
}
