'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, CheckCircle2, CreditCard, ExternalLink, Frame, LockKeyhole, MailCheck, PackageCheck, ShieldCheck, Truck } from 'lucide-react';
import { CartItem, clearCart, useCart } from '@/lib/cart-store';
import { formatCurrency } from '@/lib/format';
import { cartMetaPayload, trackMetaPixel, trackMetaPixelCustom } from '@/lib/meta-pixel';
import { WompiPaymentArt } from '@/components/wompi-payment-art';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

type PaymentMethod = 'WOMPI' | 'CASH_ON_DELIVERY';

type CheckoutForm = {
  firstName: string;
  lastName: string;
  document: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  department: string;
  notes: string;
  paymentMethod: PaymentMethod;
};

const initialForm: CheckoutForm = {
  firstName: '',
  lastName: '',
  document: '',
  email: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: 'Bogota',
  department: 'Cundinamarca',
  notes: '',
  paymentMethod: 'WOMPI',
};

function Field({ label, value, onChange, type = 'text', required = true, name, error, hint }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; name?: string; error?: string; hint?: string }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      <span>{label}{required ? null : <span className="ml-1 font-semibold text-slate-400">(opcional)</span>}</span>
      <input
        id={name}
        className={`input-brand ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        required={required}
        aria-invalid={error ? true : undefined}
      />
      {hint ? <span className="text-xs font-semibold text-slate-400">{hint}</span> : null}
      {error ? <span className="text-xs font-bold text-red-600">{error}</span> : null}
    </label>
  );
}

function validateCheckoutForm(form: CheckoutForm): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.firstName.trim()) errors.firstName = 'Ingresa tu nombre.';
  if (!form.lastName.trim()) errors.lastName = 'Ingresa tus apellidos.';
  if (!form.document.trim()) errors.document = 'Ingresa tu numero de documento.';
  if (!form.email.trim()) errors.email = 'Ingresa tu correo.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Ingresa un correo valido.';
  if (!form.phone.trim()) errors.phone = 'Ingresa tu telefono o WhatsApp.';
  if (!form.city.trim()) errors.city = 'Ingresa la ciudad.';
  if (!form.department.trim()) errors.department = 'Ingresa el departamento.';
  if (!form.addressLine1.trim()) errors.addressLine1 = 'Ingresa la direccion de entrega.';
  else if (form.addressLine1.trim().length < 4) errors.addressLine1 = 'La direccion debe tener al menos 4 caracteres.';
  return errors;
}

export function CheckoutClient() {
  const { items, subtotal } = useCart();
  const [form, setForm] = useState<CheckoutForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [createdWompi, setCreatedWompi] = useState<any>(null);
  const [completedItems, setCompletedItems] = useState<CartItem[]>([]);
  const [completedTotals, setCompletedTotals] = useState({ subtotal: 0, shipping: 0, total: 0, discount: 0 });
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; freeShipping: boolean } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponAutoApplied, setCouponAutoApplied] = useState(false);
  const autoAppliedRef = useRef(false);
  const trackedCheckoutSignature = useRef('');

  const hasCuadroPersonalizado = items.some((item) => item.product.category?.name === 'Cuadros personalizados');
  const shippingBase = subtotal > 500000 || subtotal === 0 ? 0 : 12000;
  const discount = appliedCoupon?.discount ?? 0;
  const shipping = appliedCoupon?.freeShipping ? 0 : shippingBase;
  const total = Math.max(0, subtotal + shipping - discount);
  const canSubmit = useMemo(() => items.length > 0 && !loading, [items.length, loading]);
  const checkoutSignature = useMemo(() => items.map((item) => `${item.productId}:${item.variantId ?? 'default'}:${item.quantity}`).join('|'), [items]);

  useEffect(() => {
    if (!items.length || trackedCheckoutSignature.current === checkoutSignature) return;
    trackedCheckoutSignature.current = checkoutSignature;
    trackMetaPixel('InitiateCheckout', cartMetaPayload(items, total));
  }, [checkoutSignature, items, total]);

  function update<K extends keyof CheckoutForm>(key: K, value: CheckoutForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function applyCoupon(codeOverride?: string) {
    const code = (codeOverride ?? couponInput).trim();
    if (!code) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await fetch(`${API_URL}/coupons/validate/${encodeURIComponent(code)}?subtotal=${subtotal}`);
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.valid) throw new Error(payload?.message ?? 'Cupon no valido');
      setAppliedCoupon({ code: payload.code, discount: payload.discount, freeShipping: Boolean(payload.freeShipping) });
      setCouponInput(payload.code);
    } catch (err) {
      setAppliedCoupon(null);
      if (!codeOverride) setCouponError(err instanceof Error ? err.message : 'Cupon no valido');
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
    setCouponAutoApplied(false);
  }

  useEffect(() => {
    if (autoAppliedRef.current || appliedCoupon || !items.length) return;
    let saved: string | null = null;
    try { saved = window.localStorage.getItem('collectorfigu_welcome_coupon'); } catch {
      saved = null;
    }
    if (saved) {
      autoAppliedRef.current = true;
      setCouponAutoApplied(true);
      void applyCoupon(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items.length) return;
    const validationErrors = validateCheckoutForm(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      const firstKey = Object.keys(validationErrors)[0];
      const target = document.getElementById(firstKey);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target?.focus();
      return;
    }
    setLoading(true);
    setError(null);
    setCreatedOrder(null);
    setCreatedWompi(null);

    try {
      const itemSnapshot = items;
      const subtotalSnapshot = subtotal;
      const shippingSnapshot = shipping;
      const totalSnapshot = total;
      const discountSnapshot = discount;
      const res = await fetch(`${API_URL}/orders/public/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items: items.map((item) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })),
          couponCode: appliedCoupon?.code,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.message?.join?.(', ') ?? payload?.message ?? `Error ${res.status}`);

      setCompletedItems(itemSnapshot);
      setCompletedTotals({ subtotal: subtotalSnapshot, shipping: shippingSnapshot, total: totalSnapshot, discount: discountSnapshot });
      if (appliedCoupon) {
        try { window.localStorage.removeItem('collectorfigu_welcome_coupon'); } catch {
          // localStorage no disponible
        }
      }
      setCreatedOrder(payload.order);
      setCreatedWompi(payload.wompi ?? null);
      const orderPayload = {
        ...cartMetaPayload(itemSnapshot, Number(payload.order?.grandTotal ?? totalSnapshot)),
        order_id: payload.order?.orderNumber,
        payment_method: form.paymentMethod,
      };
      trackMetaPixel('AddPaymentInfo', orderPayload);
      trackMetaPixel('Purchase', orderPayload);
      trackMetaPixelCustom('OrderCreated', orderPayload);
      clearCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear el pedido.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <section className="bg-brand-dark bg-brand-radial text-white">
        <div className="container-page py-12">
          <p className="badge-brand">Compra segura</p>
          <h1 className="mt-4 text-4xl font-black">Finaliza tu pedido</h1>
          <p className="mt-3 max-w-3xl text-white/60">Elige Wompi para pagar en una pasarela segura con los medios habilitados por el comercio, o crea un pedido contraentrega sujeto a cobertura.</p>
          <div className="mt-7 grid gap-3 md:grid-cols-3">
            {['Datos de entrega', 'Metodo de pago', 'Confirmacion'].map((step, index) => (
              <div key={step} className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-cyan/20 text-xs font-black text-brand-cyan">{index + 1}</span>
                <p className="mt-3 font-black">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_420px]">
        <form onSubmit={submit} noValidate className="card order-2 p-6 lg:order-1">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">{createdOrder ? 'Pedido generado' : 'Datos de entrega'}</h2>
              <p className="mt-2 text-sm text-slate-500">{createdOrder ? 'Resumen del pedido y siguientes pasos enviados tambien al correo registrado.' : 'Usaremos estos datos para crear el pedido, prefacturar y coordinar entrega.'}</p>
            </div>
            <LockKeyhole className="text-brand-blue" size={28} />
          </div>

          {error ? <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p> : null}
          {!error && Object.keys(errors).length > 0 ? <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">Revisa los campos marcados en rojo antes de continuar.</p> : null}
          {createdOrder ? (
            <div className="mt-6 rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="badge-brand bg-white text-emerald-700">Pedido creado</p>
                  <h3 className="mt-3 text-2xl font-black">{createdOrder.orderNumber}</h3>
                  <p className="mt-2 text-sm font-semibold">Enviamos el resumen a {form.email}. La aprobacion del pago se confirma por Wompi y cada cambio de estado se notificara al cliente.</p>
                </div>
                <MailCheck size={36} className="text-emerald-600" />
              </div>
              <div className="mt-5 grid gap-3 text-sm md:grid-cols-3">
                <div className="rounded-2xl bg-white p-4"><span className="text-emerald-700/70">Estado</span><strong className="mt-1 block">{orderStatusLabel(createdOrder.status)}</strong></div>
                <div className="rounded-2xl bg-white p-4"><span className="text-emerald-700/70">Metodo</span><strong className="mt-1 block">{paymentMethodLabel(createdOrder.paymentMethod)}</strong></div>
                <div className="rounded-2xl bg-white p-4"><span className="text-emerald-700/70">Total</span><strong className="mt-1 block">{formatCurrency(Number(createdOrder.grandTotal ?? completedTotals.total))}</strong></div>
              </div>
              <div className="mt-5 rounded-2xl bg-white p-4 text-sm font-semibold leading-6">
                <p className="font-black">Entrega</p>
                <p>{createdOrder.shippingAddress?.addressLine1}{createdOrder.shippingAddress?.addressLine2 ? `, ${createdOrder.shippingAddress.addressLine2}` : ''}</p>
                <p>{createdOrder.shippingAddress?.city}, {createdOrder.shippingAddress?.department}</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {createdWompi?.checkoutUrl ? (
                  <a href={createdWompi.checkoutUrl} className="btn-primary" rel="noreferrer" onClick={() => trackMetaPixelCustom('WompiPaymentClick', { order_id: createdOrder?.orderNumber, value: Number(createdOrder?.grandTotal ?? completedTotals.total), currency: 'COP' })}>
                    <ExternalLink size={18} /> Ir a Wompi y pagar seguro
                  </a>
                ) : null}
                <Link href="/productos" className="btn-secondary">Seguir comprando</Link>
              </div>
            </div>
          ) : (
            <>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Field label="Nombre" name="firstName" value={form.firstName} onChange={(value) => update('firstName', value)} error={errors.firstName} />
                <Field label="Apellidos" name="lastName" value={form.lastName} onChange={(value) => update('lastName', value)} error={errors.lastName} />
                <Field label="Documento" name="document" value={form.document} onChange={(value) => update('document', value)} error={errors.document} hint="Lo usamos para la factura y la guia de envio." />
                <Field label="Correo" name="email" type="email" value={form.email} onChange={(value) => update('email', value)} error={errors.email} />
                <Field label="Teléfono / WhatsApp" name="phone" value={form.phone} onChange={(value) => update('phone', value)} error={errors.phone} />
                <Field label="Ciudad" name="city" value={form.city} onChange={(value) => update('city', value)} error={errors.city} />
                <Field label="Departamento" name="department" value={form.department} onChange={(value) => update('department', value)} error={errors.department} />
                <Field label="Direccion" name="addressLine1" value={form.addressLine1} onChange={(value) => update('addressLine1', value)} error={errors.addressLine1} />
                <Field label="Complemento" name="addressLine2" value={form.addressLine2} onChange={(value) => update('addressLine2', value)} required={false} />
              </div>

              {hasCuadroPersonalizado ? (
                <div className="mt-6 rounded-[1.5rem] border border-brand-pop/25 bg-brand-pop/5 p-4">
                  <p className="inline-flex items-center gap-2 font-black text-brand-ink"><Frame size={18} className="text-brand-pop" /> Tu pedido incluye un cuadro personalizado</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Cuéntanos qué personajes quieres (nombres, franquicia y cuántos van) en el campo de abajo para armar tu pieza.</p>
                </div>
              ) : null}

              <label className="mt-4 grid gap-2 text-sm font-bold text-slate-700">
                {hasCuadroPersonalizado ? 'Personajes para tu cuadro y notas de entrega' : 'Notas de entrega'}
                <textarea
                  className="input-brand min-h-28"
                  value={form.notes}
                  onChange={(event) => update('notes', event.target.value)}
                  placeholder={hasCuadroPersonalizado ? 'Ej: Quiero a Goku y Vegeta, estilo Dragon Ball Super, para regalo de cumpleaños.' : 'Horario, barrio, referencias o condiciones de entrega.'}
                />
              </label>

              <h2 className="mt-9 text-2xl font-black">Metodo de pago</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className={`cursor-pointer rounded-3xl border p-5 transition ${form.paymentMethod === 'WOMPI' ? 'border-brand-blue bg-brand-blue/5 shadow-soft' : 'border-slate-200 bg-white'}`}>
                  <input type="radio" name="paymentMethod" value="WOMPI" checked={form.paymentMethod === 'WOMPI'} onChange={() => update('paymentMethod', 'WOMPI')} className="sr-only" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-blue text-white shadow-soft">
                      <CreditCard size={24} />
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Recomendado</span>
                  </div>
                  <p className="mt-4 text-lg font-black">Pago seguro con Wompi</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">Te llevaremos a Wompi para completar el pago con los medios habilitados en la pasarela.</p>
                  <WompiPaymentArt className="mt-4" />
                </label>
                <label className={`cursor-pointer rounded-3xl border p-5 transition ${form.paymentMethod === 'CASH_ON_DELIVERY' ? 'border-emerald-500 bg-emerald-50 shadow-soft' : 'border-slate-200 bg-white'}`}>
                  <input type="radio" name="paymentMethod" value="CASH_ON_DELIVERY" checked={form.paymentMethod === 'CASH_ON_DELIVERY'} onChange={() => update('paymentMethod', 'CASH_ON_DELIVERY')} className="sr-only" />
                  <Truck className="text-emerald-600" size={28} />
                  <p className="mt-4 font-black">Pago contraentrega</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">Pedido sujeto a cobertura, llamada/WhatsApp de confirmacion y validacion de disponibilidad antes de despacho.</p>
                </label>
              </div>

              <div className="mt-6 rounded-[2rem] border border-brand-blue/20 bg-brand-blue/5 p-5 text-sm font-semibold text-slate-600">
                <ShieldCheck size={18} className="mr-2 inline text-brand-blue" /> En Wompi no almacenamos datos sensibles de tarjetas. Si el pago es con tarjeta, la seleccion de cuotas se gestiona dentro de la pasarela cuando aplique.
              </div>
              <button className="btn-primary mt-8" disabled={!canSubmit}>{loading ? 'Creando pedido...' : form.paymentMethod === 'WOMPI' ? 'Continuar a pago seguro' : 'Crear pedido contraentrega'}</button>
            </>
          )}
        </form>

        <aside className="order-1 h-fit rounded-[2rem] bg-brand-dark bg-brand-radial p-6 text-white shadow-glow lg:sticky lg:order-2 lg:top-36">
          <div className="inline-flex rounded-2xl bg-brand-cyan/20 p-3 text-brand-cyan"><PackageCheck size={24} /></div>
          <h2 className="mt-5 text-2xl font-black">{createdOrder ? 'Resumen confirmado' : 'Resumen'}</h2>
          <div className="mt-6 grid gap-4">
            {(createdOrder ? completedItems : items).map((item) => (
              <div key={`${item.productId}:${item.variantId ?? 'default'}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex justify-between gap-3">
                  <span className="font-bold text-white">
                    {item.quantity}x {item.product.name}
                    {item.variant ? <span className="mt-1 block text-xs text-brand-cyan">Color {item.variant.colorName}</span> : null}
                  </span>
                  <strong className="font-mono">{formatCurrency(Number(item.product.price) * item.quantity)}</strong>
                </div>
              </div>
            ))}
            {!items.length && !createdOrder ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-bold text-white/70">
                Tu carrito esta vacio. <Link href="/productos" className="text-brand-cyan">Ver catalogo</Link>
              </div>
            ) : null}
          </div>
          {!createdOrder ? (
            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/50">Cupon de descuento</p>
              {appliedCoupon ? (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3">
                  <span className="inline-flex items-center gap-2 text-sm font-black text-emerald-300">
                    <BadgeCheck size={16} /> {appliedCoupon.code}
                  </span>
                  <button type="button" onClick={removeCoupon} className="text-xs font-bold text-white/60 hover:text-white">Quitar</button>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <input
                    className="h-11 flex-1 rounded-2xl border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white outline-none placeholder:text-white/40 focus:border-brand-cyan/50"
                    value={couponInput}
                    onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                    placeholder="BIENVENIDA-XXXXXX"
                  />
                  <button type="button" onClick={() => applyCoupon()} disabled={couponLoading || !couponInput.trim()} className="shrink-0 rounded-2xl bg-white px-4 text-sm font-black text-brand-dark transition disabled:opacity-50">
                    {couponLoading ? '...' : 'Aplicar'}
                  </button>
                </div>
              )}
              {couponError ? <p className="mt-2 text-xs font-bold text-red-300">{couponError}</p> : null}
              {couponAutoApplied && appliedCoupon ? <p className="mt-2 text-xs font-semibold text-white/50">Aplicamos automaticamente tu cupon de bienvenida.</p> : null}
            </div>
          ) : null}

          <div className="mt-6 grid gap-3 border-t border-white/10 pt-5 text-sm">
            <div className="flex justify-between"><span className="text-white/60">Subtotal</span><strong>{formatCurrency(createdOrder ? completedTotals.subtotal : subtotal)}</strong></div>
            {(createdOrder ? completedTotals.discount : discount) > 0 ? (
              <div className="flex justify-between text-emerald-300"><span>Descuento</span><strong>-{formatCurrency(createdOrder ? completedTotals.discount : discount)}</strong></div>
            ) : null}
            <div className="flex justify-between"><span className="text-white/60">Envio</span><strong>{(createdOrder ? completedTotals.shipping : shipping) === 0 ? 'Gratis' : formatCurrency(createdOrder ? completedTotals.shipping : shipping)}</strong></div>
            <div className="flex justify-between text-lg"><span className="font-black">Total</span><strong className="font-mono">{formatCurrency(createdOrder ? completedTotals.total : total)}</strong></div>
          </div>
          <div className="mt-5 rounded-2xl bg-white/10 p-4 text-xs leading-5 text-white/70">
            <CheckCircle2 size={16} className="mr-2 inline text-brand-cyan" /> La reserva de inventario se genera al crear el pedido.
          </div>
        </aside>
      </section>
    </main>
  );
}

function orderStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: 'Pendiente de pago',
    PAID: 'Pagado',
    PREPARING: 'En preparacion',
    SHIPPED: 'Enviado',
    DELIVERED: 'Entregado',
    CANCELLED: 'Cancelado',
  };
  return labels[status] ?? 'Estado pendiente';
}

function paymentMethodLabel(method: string) {
  if (method === 'WOMPI') return 'Wompi';
  if (method === 'CASH_ON_DELIVERY') return 'Pago contraentrega';
  return 'Metodo pendiente';
}
