import { demoProducts, getDemoProduct } from './demo-products';

const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const SERVER_API_URL = process.env.NEXT_SERVER_API_URL ?? PUBLIC_API_URL;
const isProduction = process.env.NODE_ENV === 'production';

function getApiUrl() {
  return typeof window === 'undefined' ? SERVER_API_URL : PUBLIC_API_URL;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiUrl()}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) }, next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Error de la API ${res.status}`);
  return res.json();
}

export async function getProducts(params: Record<string, any> = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])).toString();
  try {
    return await apiFetch<any>(`/products${query ? `?${query}` : ''}`);
  } catch (error) {
    if (isProduction) return { items: [], meta: { total: 0 }, unavailable: true };
    return { items: demoProducts, meta: { total: demoProducts.length }, unavailable: true };
  }
}

export async function getCatalogOptions() {
  try {
    return await apiFetch<{ brands: Array<{ id: string; name: string; slug: string }>; categories: Array<{ id: string; name: string; slug: string }> }>('/products/options');
  } catch {
    return { brands: [], categories: [] };
  }
}

export async function getProduct(slug: string) {
  try {
    return await apiFetch<any>(`/products/${slug}`);
  } catch (error) {
    if (isProduction) throw error;
    return getDemoProduct(slug);
  }
}

export async function getProductReviews(productId: string) {
  try {
    return await apiFetch<{
      summary: { count: number; average: number };
      reviews: Array<{ id: string; name: string; city?: string | null; rating: number; title?: string | null; comment: string; createdAt: string }>;
    }>(`/reviews/product/${productId}`);
  } catch {
    return { summary: { count: 0, average: 0 }, reviews: [] };
  }
}
