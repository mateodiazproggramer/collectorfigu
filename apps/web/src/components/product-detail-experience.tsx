'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FormEvent, MouseEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BadgeCheck, Blocks, Check, CheckCircle2, ChevronLeft, ChevronRight, CreditCard, Gift, Heart, Maximize2, PackagePlus, ShieldCheck, ShoppingCart, Sparkles, Star, Truck, Wallet, X } from 'lucide-react';
import { LimitedEditionBadge } from '@/components/limited-edition-badge';
import { WhatsAppIcon } from '@/components/whatsapp-icon';
import { addCartItemVariant, ProductVariant, toggleFavorite } from '@/lib/cart-store';
import { formatCurrency } from '@/lib/format';
import { productMetaPayload, trackMetaPixel, trackMetaPixelCustom } from '@/lib/meta-pixel';
import { cloudinaryThumb } from '@/lib/cloudinary';
import { deliveryEstimate, piecesLabel, presentationLabel, shippingEstimate } from '@/lib/product-marketing';
import { salesWhatsAppUrl, specialOrderWhatsAppUrl } from '@/lib/whatsapp';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

type ProductImage = {
  id?: string;
  url: string;
  alt?: string | null;
  variantId?: string | null;
};

function getDiscount(product: any) {
  if (!product.previousPrice || product.previousPrice <= product.price) return null;
  return Math.round(((product.previousPrice - product.price) / product.previousPrice) * 100);
}

function variantStock(product: any, variant?: ProductVariant) {
  if (variant) return Math.max(0, variant.stock - (variant.reserved ?? 0));
  return Math.max(0, (product.inventory?.stock ?? 0) - (product.inventory?.reserved ?? 0));
}

function productImages(product: any, variant?: ProductVariant): ProductImage[] {
  const sortImages = (images: ProductImage[]) => [...images].sort((a: any, b: any) => Number(b.isMain) - Number(a.isMain) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const variantImages = sortImages((variant?.images?.length ? variant.images : []) as ProductImage[]);
  const generalImages = sortImages(((product.images ?? []) as ProductImage[]).filter((image) => image.variantId === null || image.variantId === undefined || image.variantId === ''));
  return variantImages.length ? variantImages : generalImages.length ? generalImages : sortImages(product.images ?? []);
}

function availableVariant(product: any) {
  return ((product.variants ?? []) as ProductVariant[]).find((variant) => variantStock(product, variant) > 0);
}

function productStock(product: any) {
  const variant = availableVariant(product);
  if (variant) return variantStock(product, variant);
  return variantStock(product);
}

function productCover(product: any) {
  const generalImages = (product.images ?? [])
    .filter((image: ProductImage) => image.variantId === null || image.variantId === undefined || image.variantId === '')
    .sort((a: any, b: any) => Number(b.isMain) - Number(a.isMain) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  if (generalImages[0]?.url) return generalImages[0].url;
  const variantImages = (product.variants ?? []).flatMap((variant: ProductVariant) => variant.images ?? []);
  return variantImages[0]?.url ?? product.images?.[0]?.url;
}

function recommendationReason(product: any, accessory: any) {
  const accessoryText = `${accessory.brand?.name ?? ''} ${accessory.name ?? ''} ${accessory.category?.name ?? ''}`.toLowerCase();
  if (accessoryText.includes('llavero')) return 'Ideal para tu mochila o morral';
  if (accessoryText.includes('set')) return 'Completa tu coleccion con este set';
  if (accessory.brand?.name === product.brand?.name) return `Completa tu coleccion de ${product.brand?.name}`;
  return 'Recomendado para completar tu compra';
}

function accessoryScore(product: any, accessory: any) {
  const productText = `${product.brand?.name ?? ''} ${product.name ?? ''} ${product.category?.name ?? ''}`.toLowerCase();
  const accessoryText = `${accessory.brand?.name ?? ''} ${accessory.name ?? ''} ${accessory.category?.name ?? ''}`.toLowerCase();
  const accessoryPrice = Number(accessory.price ?? 0);
  let score = 0;

  if (accessory.id === product.id) return -999;
  if (productStock(accessory) <= 0) return -999;

  if (accessory.brand?.name && accessory.brand?.name === product.brand?.name) score += 60;
  if (accessoryText.includes('llavero')) score += 45;
  if (accessoryText.includes('set')) score += 30;
  if (productText.includes('anime') && accessoryText.includes('anime')) score += 20;
  if (accessoryPrice > 0 && accessoryPrice <= 18000) score += 15;

  return score;
}

function recommendedAccessories(product: any, candidates: any[]) {
  return candidates
    .map((accessory) => ({ accessory, score: accessoryScore(product, accessory), reason: recommendationReason(product, accessory) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || Number(a.accessory.price ?? 0) - Number(b.accessory.price ?? 0))
    .slice(0, 4);
}

function ProductVisual({ product, variant }: { product: any; variant?: ProductVariant }) {
  const images = productImages(product, variant).slice(0, 5);
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoom, setZoom] = useState({ active: false, x: 50, y: 50 });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const activeImage = images[activeIndex];

  useEffect(() => {
    setActiveIndex(0);
    setZoom({ active: false, x: 50, y: 50 });
    setLightboxOpen(false);
  }, [variant?.id, product.id]);

  useEffect(() => {
    if (images.length <= 1 || lightboxOpen || zoom.active) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [images.length, lightboxOpen, zoom.active]);

  function go(direction: -1 | 1) {
    setActiveIndex((current) => (current + direction + images.length) % images.length);
  }

  function updateZoom(event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setZoom({
      active: true,
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  }

  if (activeImage?.url) {
    return (
      <div className="grid gap-3">
        <div className="relative overflow-hidden rounded-[1.7rem] border border-slate-100 bg-slate-50">
          <button
            type="button"
            className="group block aspect-square w-full cursor-zoom-in overflow-hidden"
            onClick={() => setLightboxOpen(true)}
            onMouseMove={updateZoom}
            onMouseEnter={updateZoom}
            onMouseLeave={() => setZoom({ active: false, x: 50, y: 50 })}
            aria-label="Ampliar imagen"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cloudinaryThumb(activeImage.url, 1000)}
              alt={activeImage.alt ?? `${product.name}${variant ? ` ${variant.colorName}` : ''}`}
              className="h-full w-full object-cover transition duration-300"
              style={{
                transform: zoom.active ? 'scale(1.85)' : 'scale(1)',
                transformOrigin: `${zoom.x}% ${zoom.y}%`,
              }}
            />
            <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-white/95 px-3 py-2 text-xs font-black text-slate-700 shadow-soft">
              <Maximize2 size={14} className="mr-1" /> Zoom
            </span>
          </button>

          {images.length > 1 ? (
            <>
              <button type="button" className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-slate-800 shadow-soft" onClick={() => go(-1)} aria-label="Imagen anterior">
                <ChevronLeft size={20} />
              </button>
              <button type="button" className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-slate-800 shadow-soft" onClick={() => go(1)} aria-label="Imagen siguiente">
                <ChevronRight size={20} />
              </button>
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-white/90 px-3 py-2 shadow-soft">
                {images.map((image, index) => (
                  <button key={image.url} type="button" className={`h-2 rounded-full transition ${index === activeIndex ? 'w-6 bg-brand-blue' : 'w-2 bg-slate-300'}`} onClick={() => setActiveIndex(index)} aria-label={`Ver imagen ${index + 1}`} />
                ))}
              </div>
            </>
          ) : null}
        </div>

        {images.length > 1 ? (
          <div className="grid grid-cols-5 gap-2">
            {images.map((image, index) => (
              <button key={image.url} type="button" className={`overflow-hidden rounded-2xl border bg-white p-1 transition ${index === activeIndex ? 'border-brand-blue shadow-soft' : 'border-slate-200 hover:border-brand-blue/40'}`} onClick={() => setActiveIndex(index)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cloudinaryThumb(image.url, 150)} alt={image.alt ?? product.name} loading="lazy" className="aspect-square w-full rounded-xl object-cover" />
              </button>
            ))}
          </div>
        ) : null}

        {lightboxOpen ? (
          <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/90 p-4" role="dialog" aria-modal="true">
            <button type="button" className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white text-slate-900" onClick={() => setLightboxOpen(false)} aria-label="Cerrar zoom">
              <X size={22} />
            </button>
            {images.length > 1 ? (
              <button type="button" className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white text-slate-900" onClick={() => go(-1)} aria-label="Imagen anterior">
                <ChevronLeft size={22} />
              </button>
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cloudinaryThumb(activeImage.url, 1400)} alt={activeImage.alt ?? product.name} className="max-h-[88dvh] max-w-[92vw] rounded-2xl object-contain" />
            {images.length > 1 ? (
              <button type="button" className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white text-slate-900" onClick={() => go(1)} aria-label="Imagen siguiente">
                <ChevronRight size={22} />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative grid aspect-square place-items-center overflow-hidden rounded-[1.7rem] bg-brand-dark bg-brand-radial">
      <div className="absolute inset-0 bg-tech-grid bg-[size:40px_40px] opacity-70" />
      <Image src="/brand/collectorfigu-symbol.png" alt="CollectorFigu" width={160} height={160} className="absolute right-7 top-7 h-24 w-24 rounded-full border border-white/10 object-cover opacity-75" />
      <div className="relative grid h-72 w-48 place-items-center rounded-[3rem] border border-white/20 bg-white/10 shadow-glow backdrop-blur-xl">
        <Blocks size={148} className="text-white" strokeWidth={1.3} />
      </div>
      <div className="absolute bottom-7 left-7 right-7 grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((item) => <span key={item} className="h-20 rounded-2xl border border-white/10 bg-white/10 backdrop-blur" />)}
      </div>
    </div>
  );
}

const figureChecklist = [
  'Piezas compatibles con bloques tipo LEGO y otras marcas de bloques',
  'Recomendado para mayores de 6 anos, contiene piezas pequenas',
  'Existencias verificadas antes del despacho',
];

const cuadroChecklist = [
  'Impreso y enmarcado con materiales de calidad',
  'Tú eliges los personajes: cuéntanoslo en las notas de tu pedido',
  'Empacado con cuidado, listo para regalar',
];

const funkoChecklist = [
  'Pieza de colección lista para exhibir',
  'Empaque cuidado para regalo o vitrina',
  'Existencias verificadas antes del despacho',
];

function productChecklist(product: any) {
  const categoryName = product?.category?.name ?? '';
  if (categoryName === 'Cuadros personalizados') return cuadroChecklist;
  if (categoryName === 'Funkos & Sets') return funkoChecklist;
  return figureChecklist;
}

type ProductReviewsPayload = {
  summary: { count: number; average: number };
  reviews: Array<{ id: string; name: string; city?: string | null; rating: number; title?: string | null; comment: string; createdAt: string }>;
};

function RatingStars({ value, onChange }: { value: number; onChange?: (value: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`grid h-9 w-9 place-items-center rounded-full transition ${star <= value ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-300 hover:bg-amber-50 hover:text-amber-400'}`}
          onClick={() => onChange?.(star)}
          aria-label={`${star} estrellas`}
          disabled={!onChange}
        >
          <Star size={17} fill="currentColor" />
        </button>
      ))}
    </div>
  );
}

function ProductReviews({ product, initialReviews }: { product: any; initialReviews?: ProductReviewsPayload }) {
  const [reviews] = useState(initialReviews?.reviews ?? []);
  const [summary] = useState(initialReviews?.summary ?? { count: 0, average: 0 });
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_URL}/reviews/product/${product.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, city: city || undefined, rating, title: title || undefined, comment }),
      });
      if (!res.ok) throw new Error('No fue posible enviar tu comentario.');
      setName('');
      setCity('');
      setRating(5);
      setTitle('');
      setComment('');
      setMessage('Gracias. Tu comentario queda en revisión antes de publicarse.');
      trackMetaPixelCustom('ReviewSubmit', { product_id: product.id, product_name: product.name, rating });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible enviar tu comentario.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-soft sm:rounded-[2rem] sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-brand-blue">Comentarios</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Opiniones de coleccionistas</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Reseñas verificadas y moderadas por CollectorFigu.</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 text-center">
          {summary.count ? (
            <>
              <p className="text-3xl font-black text-slate-950">{summary.average.toFixed(1)}</p>
              <p className="mt-1 text-xs font-black text-slate-500">{summary.count} comentario{summary.count === 1 ? '' : 's'}</p>
            </>
          ) : (
            <p className="text-xs font-black text-slate-500">Se el primero en opinar</p>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {reviews.map((review) => (
          <article key={review.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-black text-slate-950">{review.name}</p>
                <p className="text-xs font-semibold text-slate-500">{review.city ? `${review.city} · ` : ''}{new Date(review.createdAt).toLocaleDateString('es-CO')}</p>
              </div>
              <RatingStars value={review.rating} />
            </div>
            {review.title ? <p className="mt-3 font-black text-slate-800">{review.title}</p> : null}
            <p className="mt-2 text-sm leading-6 text-slate-600">{review.comment}</p>
          </article>
        ))}
        {!reviews.length ? <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Aun no hay resenas de este producto. Cuentanos tu experiencia y ayuda a otros coleccionistas.</p> : null}
      </div>

      <form onSubmit={submitReview} className="mt-5 grid gap-3 border-t border-slate-100 pt-5">
        <div>
          <p className="font-black text-slate-950">Deja tu comentario</p>
          <p className="mt-1 text-xs font-bold text-slate-500">Se publica después de revisión para mantener la tienda limpia y útil.</p>
        </div>
        <RatingStars value={rating} onChange={setRating} />
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="input-brand" value={name} onChange={(event) => setName(event.target.value)} placeholder="Tu nombre" minLength={2} maxLength={80} required />
          <input className="input-brand" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Ciudad (opcional)" maxLength={80} />
        </div>
        <input className="input-brand" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Título corto (opcional)" maxLength={100} />
        <textarea className="input-brand min-h-28 resize-y" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Cuéntanos cómo fue tu experiencia" minLength={10} maxLength={1200} required />
        {message ? <p className={`rounded-2xl p-3 text-sm font-bold ${message.startsWith('Gracias') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{message}</p> : null}
        <button className="btn-primary w-full sm:w-auto" disabled={sending}>{sending ? 'Enviando...' : 'Enviar comentario'}</button>
      </form>
    </section>
  );
}

export function ProductDetailExperience({ product, accessoryCandidates = [], cheaperAlternatives = [], reviews }: { product: any; accessoryCandidates?: any[]; cheaperAlternatives?: any[]; reviews?: ProductReviewsPayload }) {
  const router = useRouter();
  const variants = useMemo(() => (product.variants ?? []) as ProductVariant[], [product.variants]);
  const [selectedVariantId, setSelectedVariantId] = useState(() => availableVariant(product)?.id ?? '');
  const [added, setAdded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [accessoryAddedIds, setAccessoryAddedIds] = useState<string[]>([]);
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId);
  const stock = variantStock(product, selectedVariant);
  const discount = getDiscount(product);
  const accessories = useMemo(() => recommendedAccessories(product, accessoryCandidates), [product, accessoryCandidates]);

  useEffect(() => {
    trackMetaPixel('ViewContent', productMetaPayload(product, undefined, 1));
  }, [product]);

  function addMainProduct() {
    if (stock <= 0 || (variants.length > 0 && !selectedVariant)) return false;
    addCartItemVariant(product, selectedVariant, 1);
    trackMetaPixel('AddToCart', productMetaPayload(product, selectedVariant, 1));
    return true;
  }

  function add() {
    if (!addMainProduct()) return;
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  }

  function buyNow() {
    if (!addMainProduct()) return;
    trackMetaPixelCustom('BuyNowClick', productMetaPayload(product, selectedVariant, 1));
    if (accessories.length) {
      setUpsellOpen(true);
      trackMetaPixelCustom('AccessoryUpsellView', { product_id: product.id, product_name: product.name, recommendations: accessories.map((entry) => entry.accessory.name) });
      return;
    }
    router.push('/checkout');
  }

  function addAccessory(accessory: any) {
    const variant = availableVariant(accessory);
    addCartItemVariant(accessory, variant, 1);
    trackMetaPixel('AddToCart', productMetaPayload(accessory, variant, 1));
    trackMetaPixelCustom('AccessoryAdd', { product_id: product.id, accessory_id: accessory.id, accessory_name: accessory.name });
    setAccessoryAddedIds((current) => current.includes(accessory.id) ? current : [...current, accessory.id]);
  }

  function continueToCheckout() {
    trackMetaPixelCustom('DirectCheckoutClick', { product_id: product.id, product_name: product.name, accessories_added: accessoryAddedIds.length });
    router.push('/checkout');
  }

  function save() {
    setSaved(toggleFavorite(product));
  }

  return (
    <section className="container-page grid gap-6 pb-28 pt-6 lg:grid-cols-[1fr_.9fr] lg:gap-10 lg:py-10">
      <div className="space-y-4">
        <div className="card p-2 sm:p-4">
          <ProductVisual product={product} variant={selectedVariant} />
        </div>
        <Link href="/productos" className="btn-light w-full">
          <ArrowLeft size={18} className="mr-2" /> Ver todo el catalogo
        </Link>
      </div>

      <section>
        <div className="flex flex-wrap items-center gap-2">
          <p className="badge-brand">{product.brand?.name}</p>
          <LimitedEditionBadge isLimitedEdition={product.isLimitedEdition} size="md" />
          {discount ? <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-black text-white">-{discount}%</span> : null}
          {product.isFeatured ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-600"><Star size={13} fill="currentColor" /> Selección CollectorFigu</span> : null}
        </div>
        <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">{product.name}</h1>
        {product.character ? <p className="mt-2 text-base font-bold text-brand-blue">{product.character}</p> : null}
        {reviews?.summary?.count ? (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center gap-0.5 text-amber-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} size={16} fill={star <= Math.round(reviews.summary.average) ? 'currentColor' : 'none'} className={star <= Math.round(reviews.summary.average) ? '' : 'text-slate-200'} />
              ))}
            </div>
            <span className="text-sm font-black text-slate-800">{reviews.summary.average.toFixed(1)}</span>
            <span className="text-sm font-semibold text-slate-500">({reviews.summary.count} reseña{reviews.summary.count === 1 ? '' : 's'})</span>
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
          <span className="inline-flex items-center gap-2"><BadgeCheck size={17} className="text-brand-blue" /> Existencias: {stock} unidades</span>
          {selectedVariant ? <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded-full border border-slate-200" style={{ backgroundColor: selectedVariant.colorHex }} /> Color {selectedVariant.colorName}</span> : null}
          <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />
          <span className="inline-flex items-center gap-2"><Blocks size={17} className="text-brand-blue" /> {presentationLabel(product)} · {piecesLabel(product)}</span>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-soft sm:rounded-[2rem] sm:p-6">
          <div className="flex flex-wrap items-end gap-3">
            <p className="font-mono text-3xl font-black text-brand-dark sm:text-4xl">{formatCurrency(product.price)}</p>
            {product.previousPrice ? <p className="pb-1 font-mono text-lg text-slate-400 line-through">{formatCurrency(product.previousPrice)}</p> : null}
          </div>
          <p className="mt-2 text-sm font-bold text-emerald-700">Paga con Wompi, transferencia o contraentrega según ciudad.</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{shippingEstimate(product)}.</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{deliveryEstimate(product)}.</p>

          {variants.length ? (
            <div className="mt-5">
              <p className="text-sm font-black text-slate-700">Color disponible</p>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
                {variants.map((variant) => {
                  const isSelected = variant.id === selectedVariantId;
                  const available = variantStock(product, variant);
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-black transition ${isSelected ? 'border-brand-blue bg-brand-blue/5 text-brand-blue shadow-soft' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-blue/40'}`}
                    >
                      <span className="h-5 w-5 rounded-full border border-slate-200" style={{ backgroundColor: variant.colorHex }} />
                      {variant.colorName}
                      <span className="text-xs text-slate-400">({available})</span>
                    </button>
                  );
                })}
              </div>
              {!selectedVariant ? <p className="mt-2 text-xs font-bold text-slate-500">Selecciona un color para ver sus fotos y agregarlo al carrito.</p> : null}
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <button className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50" onClick={buyNow} disabled={stock <= 0 || (variants.length > 0 && !selectedVariant)}>
              <CreditCard size={18} className="mr-2" /> Realizar pedido
            </button>
            <button className="btn-light w-full disabled:cursor-not-allowed disabled:opacity-50" onClick={add} disabled={stock <= 0 || (variants.length > 0 && !selectedVariant)}>
              <ShoppingCart size={18} className="mr-2" /> {variants.length > 0 && !selectedVariant ? 'Elige color' : stock <= 0 ? 'Sin existencias' : added ? 'Agregado' : 'Agregar al carrito'}
            </button>
            <button className="btn-light w-full" onClick={save}>
              <Heart size={18} className="mr-2" /> {saved ? 'Guardado' : 'Guardar'}
            </button>
          </div>
          {added ? (
            <div className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
              Producto agregado{selectedVariant ? ` en color ${selectedVariant.colorName}` : ''}. <Link href="/carrito" className="underline">Ver carrito</Link>
            </div>
          ) : null}

          {accessories.length ? (
            <div className="mt-4 rounded-[1.5rem] border border-brand-blue/15 bg-brand-blue/5 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-brand-blue shadow-soft">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="font-black text-slate-950">Completa tu coleccion</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Seleccionados por franquicia, personaje y presentacion.</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {accessories.slice(0, 3).map(({ accessory, reason }) => (
                  <button key={accessory.id} type="button" onClick={() => addAccessory(accessory)} className="grid min-w-52 grid-cols-[52px_1fr] gap-3 rounded-2xl border border-white bg-white p-2 text-left shadow-soft transition hover:border-brand-blue/30">
                    <span className="grid h-[52px] w-[52px] place-items-center overflow-hidden rounded-xl bg-slate-100 text-brand-blue">
                      {productCover(accessory) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cloudinaryThumb(productCover(accessory), 120)} alt={accessory.name} loading="lazy" className="h-full w-full object-cover" />
                      ) : <PackagePlus size={20} />}
                    </span>
                    <span className="min-w-0">
                      <span className="line-clamp-1 text-xs font-black text-slate-950">{accessory.name}</span>
                      <span className="mt-0.5 block text-[11px] font-semibold text-slate-500">{reason}</span>
                      <span className="mt-1 inline-flex items-center text-xs font-black text-brand-blue">{accessoryAddedIds.includes(accessory.id) ? 'Agregado' : formatCurrency(accessory.price)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-5 rounded-[1.5rem] border border-brand-blue/20 bg-brand-blue/5 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-blue text-white">
                  <Gift size={20} />
                </div>
                <div>
                  <p className="font-black text-slate-950">No encuentras el personaje que buscas?</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Armamos pedidos especiales, sets de regalo y pedidos al por mayor por WhatsApp.</p>
                </div>
              </div>
              <a href={specialOrderWhatsAppUrl(product.name)} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-brand-blue px-4 py-3 text-sm font-black text-white transition hover:bg-brand-blueInk">
                <WhatsAppIcon size={17} className="mr-2" /> Pedido especial
              </a>
            </div>
          </div>

          <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600 sm:grid-cols-2">
            <span className="rounded-2xl bg-slate-50 p-3"><Truck size={18} className="mr-2 inline text-brand-blue" /> {shippingEstimate(product)}</span>
            <a href={salesWhatsAppUrl(product.name)} target="_blank" rel="noreferrer" className="rounded-2xl bg-slate-50 p-3 transition hover:bg-emerald-50 hover:text-emerald-700"><WhatsAppIcon size={18} className="mr-2 inline text-emerald-600" /> Asesoría por WhatsApp</a>
          </div>
        </div>

        {cheaperAlternatives.length ? (
          <section className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-soft sm:rounded-[2rem] sm:p-6">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Wallet size={18} />
              </div>
              <div>
                <p className="font-black text-slate-950">¿Buscas mas figuras de {product.brand?.name}?</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">Misma franquicia y presentacion, de mayor a menor precio.</p>
              </div>
            </div>
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {cheaperAlternatives.map((alt: any) => (
                <Link key={alt.id} href={`/productos/${alt.slug}`} className="group grid w-36 shrink-0 gap-2 rounded-2xl border border-slate-200 p-2 transition hover:border-brand-blue/40 hover:shadow-soft sm:w-40">
                  <div className="aspect-square overflow-hidden rounded-xl bg-slate-100">
                    {productCover(alt) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cloudinaryThumb(productCover(alt), 200)} alt={alt.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                    ) : (
                      <div className="grid h-full place-items-center text-brand-blue"><Blocks size={28} /></div>
                    )}
                  </div>
                  <div>
                    <p className="line-clamp-2 text-xs font-black leading-tight text-slate-950">{alt.name}</p>
                    <p className="mt-1 text-sm font-black text-brand-dark">{formatCurrency(alt.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <p className="mt-6 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">{product.description}</p>

        <div className="mt-6 grid gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-soft sm:grid-cols-2 sm:rounded-[2rem] sm:p-6">
          <span className="inline-flex items-center gap-3 font-semibold text-slate-700"><Blocks className="text-brand-blue" size={20} /> {presentationLabel(product)}</span>
          <span className="inline-flex items-center gap-3 font-semibold text-slate-700"><PackagePlus className="text-brand-blue" size={20} /> {piecesLabel(product)}</span>
          <span className="inline-flex items-center gap-3 font-semibold text-slate-700"><BadgeCheck className="text-brand-blue" size={20} /> Existencias: {stock} unidades</span>
          <span className="inline-flex items-center gap-3 font-semibold text-slate-700"><ShieldCheck className="text-brand-blue" size={20} /> Compra protegida</span>
        </div>

        <div className="mt-6 rounded-[1.5rem] bg-brand-dark bg-brand-radial p-4 text-white sm:rounded-[2rem] sm:p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-brand-cyan/20 p-3 text-brand-cyan"><Blocks size={22} /></div>
            <div>
              <h2 className="font-black">Detalles de la pieza CollectorFigu</h2>
              <div className="mt-4 grid gap-3">
                {productChecklist(product).map((item) => (
                  <p key={item} className="flex items-start gap-3 text-sm leading-6 text-white/70"><CheckCircle2 size={17} className="mt-1 shrink-0 text-brand-cyan" /> {item}</p>
                ))}
              </div>
            </div>
          </div>
        </div>

        <ProductReviews product={product} initialReviews={reviews} />
      </section>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-12px_35px_rgba(15,23,42,.12)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-2 gap-2">
          <button className="btn-primary min-w-0 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50" onClick={buyNow} disabled={stock <= 0 || (variants.length > 0 && !selectedVariant)}>
            <CreditCard size={16} className="mr-1.5 shrink-0" /> Pedir
          </button>
          <button className="btn-light min-w-0 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50" onClick={add} disabled={stock <= 0 || (variants.length > 0 && !selectedVariant)}>
            <ShoppingCart size={16} className="mr-1.5 shrink-0" /> {variants.length > 0 && !selectedVariant ? 'Color' : stock <= 0 ? 'Sin stock' : added ? 'Agregado' : 'Carrito'}
          </button>
        </div>
      </div>

      {upsellOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6" role="dialog" aria-modal="true">
          <div className="max-h-[88dvh] w-full overflow-y-auto rounded-t-[2rem] bg-white p-4 shadow-[0_-24px_60px_rgba(15,23,42,.25)] sm:max-w-2xl sm:rounded-[2rem] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="inline-flex items-center rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-black text-brand-blue"><Sparkles size={13} className="mr-1" /> Completa tu coleccion</p>
                <h2 className="mt-3 text-2xl font-black text-slate-950">Antes de pagar, arma tu set</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Puedes agregar figuras y llaveros compatibles ahora o pasar directo al checkout.</p>
              </div>
              <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700" onClick={() => setUpsellOpen(false)} aria-label="Cerrar recomendaciones">
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              {accessories.map(({ accessory, reason }) => {
                const image = productCover(accessory);
                const isAdded = accessoryAddedIds.includes(accessory.id);
                return (
                  <article key={accessory.id} className="grid grid-cols-[76px_1fr] gap-3 rounded-2xl border border-slate-200 p-2.5 sm:grid-cols-[88px_1fr_auto] sm:items-center sm:p-3">
                    <div className="grid aspect-square place-items-center overflow-hidden rounded-2xl bg-slate-100 text-brand-blue">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cloudinaryThumb(image, 200)} alt={accessory.name} loading="lazy" className="h-full w-full object-cover" />
                      ) : <PackagePlus size={26} />}
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 font-black leading-tight text-slate-950">{accessory.name}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{reason}</p>
                      <p className="mt-2 text-lg font-black text-brand-dark">{formatCurrency(accessory.price)}</p>
                    </div>
                    <button type="button" className={`col-span-2 inline-flex min-h-11 items-center justify-center rounded-2xl px-4 text-sm font-black transition sm:col-span-1 ${isAdded ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-blue text-white hover:bg-brand-blueInk'}`} onClick={() => addAccessory(accessory)} disabled={isAdded}>
                      {isAdded ? <Check size={17} className="mr-2" /> : <PackagePlus size={17} className="mr-2" />}
                      {isAdded ? 'Agregado' : 'Agregar'}
                    </button>
                  </article>
                );
              })}
            </div>

            <div className="sticky bottom-0 -mx-4 mt-5 grid gap-2 border-t border-slate-100 bg-white p-4 sm:-mx-6 sm:grid-cols-2 sm:px-6">
              <button type="button" className="btn-primary w-full" onClick={continueToCheckout}>
                Ir al pago <ArrowRight size={18} className="ml-2" />
              </button>
              <button type="button" className="btn-light w-full" onClick={continueToCheckout}>
                No gracias, pagar ahora
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
