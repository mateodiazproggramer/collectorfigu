// PENDIENTE: configura NEXT_PUBLIC_META_PIXEL_ID con el Pixel ID real de CollectorFigu en Meta Business Suite.
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '';
export const META_CURRENCY = 'COP';
const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const SESSION_KEY = 'collectorfigu_analytics_session';

type MetaPixelParameters = Record<string, unknown>;

declare global {
  interface Window {
    fbq?: (method: 'track' | 'trackCustom', event: string, parameters?: MetaPixelParameters) => void;
    _fbq?: unknown;
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (method: 'event', event: string, parameters?: MetaPixelParameters) => void;
  }
}

function trackGoogleEvent(event: string, parameters?: MetaPixelParameters) {
  if (typeof window === 'undefined') return;
  window.dataLayer?.push({ event, ...(parameters ?? {}) });
  window.gtag?.('event', event, parameters);
}

function analyticsSessionId() {
  if (typeof window === 'undefined') return undefined;
  try {
    const current = window.localStorage.getItem(SESSION_KEY);
    if (current) return current;
    const next = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return undefined;
  }
}

export function trackSiteAnalytics(event: string, parameters?: MetaPixelParameters) {
  if (typeof window === 'undefined') return;
  const productId = typeof parameters?.product_id === 'string' ? parameters.product_id : undefined;
  const payload = {
    event,
    path: `${window.location.pathname}${window.location.search}`,
    productId,
    sessionId: analyticsSessionId(),
    metadata: parameters ?? {},
  };
  fetch(`${PUBLIC_API_URL}/analytics/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
}

export function trackMetaPixel(event: string, parameters?: MetaPixelParameters) {
  if (typeof window === 'undefined') return;
  if (typeof window.fbq === 'function') window.fbq('track', event, parameters);
  trackGoogleEvent(event, parameters);
  trackSiteAnalytics(event, parameters);
}

export function trackMetaPixelCustom(event: string, parameters?: MetaPixelParameters) {
  if (typeof window === 'undefined') return;
  if (typeof window.fbq === 'function') window.fbq('trackCustom', event, parameters);
  trackGoogleEvent(event, parameters);
  trackSiteAnalytics(event, parameters);
}

export function productMetaPayload(product: any, variant?: any, quantity = 1) {
  const price = Number(product?.price ?? 0);
  const id = String(variant?.sku ?? variant?.id ?? product?.sku ?? product?.id ?? product?.slug ?? 'product');
  return {
    product_id: product?.id,
    product_slug: product?.slug,
    content_ids: [id],
    content_name: product?.name,
    content_type: 'product',
    contents: [{ id, quantity, item_price: price }],
    currency: META_CURRENCY,
    value: price * quantity,
    brand: product?.brand?.name,
    category: product?.category?.name,
  };
}

export function cartMetaPayload(items: any[], total?: number) {
  const contents = items.map((item) => {
    const price = Number(item.product?.price ?? 0);
    const id = String(item.variant?.sku ?? item.variantId ?? item.product?.sku ?? item.productId);
    return {
      id,
      quantity: item.quantity,
      item_price: price,
    };
  });
  const value = total ?? items.reduce((sum, item) => sum + Number(item.product?.price ?? 0) * item.quantity, 0);
  return {
    content_ids: contents.map((item) => item.id),
    content_type: 'product',
    contents,
    currency: META_CURRENCY,
    value,
    num_items: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}
