'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, CreditCard, Minus, Plus, ShieldCheck, ShoppingBag, Trash2, Truck } from 'lucide-react';
import { cartLineId, CartItem, clearCart, removeCartItem, setCartItems, updateCartItem, useCart } from '@/lib/cart-store';
import { formatCurrency } from '@/lib/format';
import { cartMetaPayload, trackMetaPixelCustom } from '@/lib/meta-pixel';
import { piecesLabel, presentationLabel, shippingEstimate } from '@/lib/product-marketing';
import { cloudinaryThumb } from '@/lib/cloudinary';
import { LimitedEditionBadge } from '@/components/limited-edition-badge';
import { WompiPaymentArt } from '@/components/wompi-payment-art';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

function productImage(item: CartItem) {
  const generalImages = (item.product.images ?? []).filter((image: any) => !image.variantId);
  return item.variant?.images?.[0]?.url ?? generalImages.find((image: any) => image.isMain)?.url ?? generalImages[0]?.url ?? item.product.images?.[0]?.url;
}

export function CartView() {
  const { items, subtotal } = useCart();
  const [syncing, setSyncing] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const trackedCartSignature = useRef('');
  const freeShipping = subtotal > 500000 || subtotal === 0;
  const taxes = 0;
  const total = subtotal + taxes;
  const cartSignature = useMemo(() => items.map((item) => `${item.productId}:${item.variantId ?? 'default'}:${item.quantity}`).join('|'), [items]);

  useEffect(() => {
    async function validate() {
      if (!items.length) {
        setWarnings([]);
        return;
      }
      setSyncing(true);
      try {
        const res = await fetch(`${API_URL}/cart/guest/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: items.map((item) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })) }),
        });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const payload = await res.json();
        const nextWarnings: string[] = [];
        const nextItems = payload.items
          .filter((entry: any) => {
            if (!entry.product) {
              nextWarnings.push('Se retiro un producto que ya no existe.');
              return false;
            }
            if (!entry.isAvailable) {
              nextWarnings.push(`${entry.product.name} no tiene existencias suficientes. Ajustamos la cantidad disponible.`);
            }
            return entry.availableQuantity > 0 && entry.product.status === 'ACTIVE';
          })
          .map((entry: any) => ({
            productId: entry.productId,
            variantId: entry.variantId,
            quantity: Math.min(entry.requestedQuantity, entry.availableQuantity),
            product: entry.product,
            variant: entry.variant,
          }));
        setWarnings(nextWarnings);
        setCartItems(nextItems);
      } catch {
        setWarnings(['No pudimos validar inventario en este momento. Intenta actualizar de nuevo.']);
      } finally {
        setSyncing(false);
      }
    }
    void validate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const canCheckout = useMemo(() => items.length > 0 && warnings.length === 0, [items.length, warnings.length]);

  useEffect(() => {
    if (!items.length || trackedCartSignature.current === cartSignature) return;
    trackedCartSignature.current = cartSignature;
    trackMetaPixelCustom('ViewCart', cartMetaPayload(items, total));
  }, [cartSignature, items, total]);

  return (
    <main>
      <section className="bg-brand-dark bg-brand-radial text-white">
        <div className="container-page py-12">
          <p className="badge-brand">Carrito de compras</p>
          <h1 className="mt-4 text-4xl font-black">Confirma tus productos</h1>
          <p className="mt-3 text-white/60">Agrega, elimina, modifica cantidades y valida existencias antes de pagar.</p>
          <div className="mt-7 grid gap-3 md:grid-cols-3">
            {['Carrito', 'Datos y entrega', 'Pago seguro'].map((step, index) => (
              <div key={step} className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <span className="text-xs font-black text-brand-cyan">Paso {index + 1}</span>
                <p className="mt-1 font-black">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_390px]">
        <div className="grid gap-4">
          {warnings.map((warning) => (
            <div key={warning} className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-700">{warning}</div>
          ))}
          {syncing ? <div className="rounded-2xl bg-brand-blue/5 p-4 text-sm font-bold text-brand-blue">Validando inventario...</div> : null}

          {items.length ? (
            <div className="flex justify-end">
              <button
                className="text-xs font-bold text-brand-inkSoft/70 underline-offset-2 hover:text-red-500 hover:underline"
                onClick={() => { if (window.confirm('Seguro que quieres vaciar el carrito?')) clearCart(); }}
              >
                Vaciar carrito
              </button>
            </div>
          ) : null}

          {items.map((item) => {
            const lineId = cartLineId(item);
            const image = productImage(item);
            const stock = item.variant ? Math.max(0, item.variant.stock - (item.variant.reserved ?? 0)) : item.product.inventory?.stock ?? 1;
            return (
              <article key={lineId} className="card flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
                <div className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-3xl bg-brand-dark bg-brand-radial text-brand-cyan shadow-glow">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cloudinaryThumb(image, 220)} alt={item.product.name} loading="lazy" className="h-full w-full object-cover" />
                  ) : <ShoppingBag size={38} />}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-blue">{item.product.brand?.name}</p>
                    <LimitedEditionBadge isLimitedEdition={item.product.isLimitedEdition} />
                  </div>
                  <Link href={`/productos/${item.product.slug}`} className="mt-1 block text-xl font-black hover:text-brand-blue">{item.product.name}</Link>
                  {item.variant ? (
                    <p className="mt-1 inline-flex items-center gap-2 text-sm font-black text-brand-blue">
                      <span className="h-4 w-4 rounded-full border border-brand-line" style={{ backgroundColor: item.variant.colorHex }} /> Color {item.variant.colorName}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm text-brand-inkSoft">{presentationLabel(item.product)} · {piecesLabel(item.product)}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-brand-inkSoft">
                    <span className="rounded-full bg-brand-paper2 px-3 py-1"><Truck size={13} className="mr-1 inline text-brand-blue" /> {shippingEstimate(Number(item.product.price) * item.quantity)}</span>
                    <span className="rounded-full bg-brand-paper2 px-3 py-1"><BadgeCheck size={13} className="mr-1 inline text-brand-blue" /> Existencias {stock}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-brand-line p-2">
                  <button className="rounded-xl bg-brand-paper2 p-2" onClick={() => updateCartItem(lineId, Math.max(1, item.quantity - 1))}><Minus size={15} /></button>
                  <span className="min-w-8 px-3 text-center font-black">{item.quantity}</span>
                  <button className="rounded-xl bg-brand-paper2 p-2" onClick={() => updateCartItem(lineId, Math.min(stock, item.quantity + 1))}><Plus size={15} /></button>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xl font-black">{formatCurrency(Number(item.product.price) * item.quantity)}</p>
                  <p className="mt-1 font-mono text-xs text-brand-inkSoft/70">{formatCurrency(item.product.price)} c/u</p>
                  <button className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-red-500" onClick={() => removeCartItem(lineId)}><Trash2 size={14} /> Eliminar</button>
                </div>
              </article>
            );
          })}

          {!items.length ? (
            <div className="card p-10 text-center">
              <ShoppingBag className="mx-auto text-brand-blue" size={42} />
              <h2 className="mt-4 text-2xl font-black">Tu carrito esta vacio</h2>
              <p className="mt-2 text-brand-inkSoft">Agrega una figura desde el catalogo para continuar.</p>
              <Link href="/productos" className="btn-primary mt-6">Ver catalogo</Link>
            </div>
          ) : null}

          <div className="rounded-[2rem] border border-brand-blue/20 bg-brand-blue/5 p-5 text-sm font-semibold text-brand-inkSoft">
            <ShieldCheck size={18} className="mr-2 inline text-brand-blue" /> Tus productos se validan contra inventario antes de crear el pago.
          </div>
        </div>

        <aside className="card h-fit p-6 lg:sticky lg:top-36">
          <h2 className="text-2xl font-black">Resumen</h2>
          <div className="mt-6 grid gap-4 text-sm">
            <div className="flex justify-between"><span className="text-brand-inkSoft">Subtotal</span><strong>{formatCurrency(subtotal)}</strong></div>
            <div className="flex justify-between"><span className="text-brand-inkSoft">Envio</span><strong>{freeShipping ? 'Gratis' : 'Bogota $9.000 · Resto $18.500'}</strong></div>
            <div className="flex justify-between"><span className="text-brand-inkSoft">Impuestos</span><strong>{formatCurrency(taxes)}</strong></div>
          </div>
          <div className="mt-6 rounded-2xl bg-brand-paper2 p-4 text-xs leading-5 text-brand-inkSoft">
            <CreditCard size={16} className="mr-2 inline text-brand-blue" /> Pago con Wompi, transferencia o contraentrega segun cobertura.
          </div>
          <WompiPaymentArt className="mt-4" />
          <div className="mt-6 border-t border-brand-line pt-5">
            <div className="flex justify-between text-lg"><span className="font-black">Total</span><strong className="font-mono">{formatCurrency(total)}</strong></div>
            {!freeShipping ? <p className="mt-1 text-xs font-semibold text-brand-inkSoft/70">El envio se calcula en el siguiente paso segun tu ciudad.</p> : null}
            {canCheckout ? (
              <Link href="/checkout" className="btn-primary mt-5 w-full" onClick={() => trackMetaPixelCustom('CheckoutClick', cartMetaPayload(items, total))}>Finalizar compra <ArrowRight size={18} className="ml-2" /></Link>
            ) : (
              <button className="mt-5 inline-flex w-full cursor-not-allowed items-center justify-center rounded-2xl border border-dashed border-brand-inkSoft/25 bg-brand-inkSoft/5 px-5 py-3 font-bold text-brand-inkSoft/50" disabled>Finalizar compra</button>
            )}
            <Link href="/productos" className="mt-3 inline-flex w-full justify-center text-sm font-black text-brand-inkSoft hover:text-brand-blue">Seguir comprando</Link>
          </div>
        </aside>
      </section>
    </main>
  );
}
