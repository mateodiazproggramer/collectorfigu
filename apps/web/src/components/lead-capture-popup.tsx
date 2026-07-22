'use client';

import { FormEvent, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Check, Copy, Gift, Loader2, X } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const STORAGE_SUBSCRIBED = 'collectorfigu_lead_subscribed';
const STORAGE_COUPON = 'collectorfigu_welcome_coupon';
const STORAGE_DISMISSED_AT = 'collectorfigu_lead_dismissed_at';
const DISMISS_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 5000;
const TRIGGER_PATH_PREFIXES = ['/productos', '/anime', '/superheroes', '/peliculas-series', '/gaming-deportes'];

function shouldTriggerOnPath(pathname: string) {
  return TRIGGER_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function LeadCapturePopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!pathname || !shouldTriggerOnPath(pathname)) return;
    let alreadySubscribed = false;
    let cooldownActive = false;
    try {
      alreadySubscribed = Boolean(window.localStorage.getItem(STORAGE_SUBSCRIBED));
      const dismissedAt = Number(window.localStorage.getItem(STORAGE_DISMISSED_AT) ?? 0);
      cooldownActive = Boolean(dismissedAt) && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;
    } catch {
      alreadySubscribed = false;
    }
    if (alreadySubscribed || cooldownActive) return;
    const timer = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  function close() {
    setOpen(false);
    if (step === 'form') {
      try { window.localStorage.setItem(STORAGE_DISMISSED_AT, String(Date.now())); } catch {
        // localStorage no disponible
      }
    }
  }

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!email.trim()) nextErrors.email = 'Ingresa tu correo.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = 'Ingresa un correo valido.';
    if (!phone.trim()) nextErrors.phone = 'Ingresa tu telefono.';
    else if (!/^(\+?57)?3\d{9}$/.test(phone.trim().replace(/\s/g, ''))) nextErrors.phone = 'Ingresa un numero de telefono colombiano valido (ej. 3001234567).';
    if (!consent) nextErrors.consent = 'Autoriza el uso de tus datos para continuar.';
    return nextErrors;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`${API_URL}/leads/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), phone: phone.trim(), source: 'productos_popup', marketingConsent: consent }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.message?.join?.(', ') ?? payload?.message ?? 'No fue posible registrar tus datos.');
      setCouponCode(payload.couponCode);
      setStep('success');
      try {
        window.localStorage.setItem(STORAGE_SUBSCRIBED, '1');
        window.localStorage.setItem(STORAGE_COUPON, payload.couponCode);
      } catch {
        // localStorage no disponible
      }
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'No fue posible registrar tus datos.');
    } finally {
      setLoading(false);
    }
  }

  function copyCode() {
    navigator.clipboard?.writeText(couponCode).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-brand-ink/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" onClick={close}>
      <div
        className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[2rem] bg-white shadow-[0_-24px_60px_rgba(15,23,42,.25)] sm:rounded-[2rem] sm:shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" onClick={close} aria-label="Cerrar" className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-brand-inkSoft shadow-soft transition hover:bg-white">
          <X size={18} />
        </button>

        {step === 'form' ? (
          <>
            <div className="rounded-t-[2rem] bg-brand-dark bg-brand-radial p-6 text-white">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-cyan/20 text-brand-cyan">
                <Gift size={24} />
              </div>
              <h2 className="mt-4 text-2xl font-black leading-tight">Obten 5% OFF en tu primera compra</h2>
              <p className="mt-2 text-sm leading-6 text-white/70">Registrate y te damos un cupon inmediato para tu proxima figura, set o llavero armable.</p>
            </div>

            <form onSubmit={submit} noValidate className="grid gap-3 p-6">
              {apiError ? <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{apiError}</p> : null}
              <label className="grid gap-2 text-sm font-bold text-brand-inkSoft">
                Correo electronico
                <input
                  className={`input-brand ${errors.email ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                />
                {errors.email ? <span className="text-xs font-bold text-red-600">{errors.email}</span> : null}
              </label>
              <label className="grid gap-2 text-sm font-bold text-brand-inkSoft">
                Teléfono / WhatsApp
                <input
                  className={`input-brand ${errors.phone ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`}
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="3001234567"
                />
                {errors.phone ? <span className="text-xs font-bold text-red-600">{errors.phone}</span> : null}
              </label>
              <label className="mt-1 flex items-start gap-3 text-xs leading-5 text-brand-inkSoft">
                <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-blue" />
                <span>
                  Autorizo el tratamiento de mis datos para recibir ofertas y novedades de CollectorFigu, segun la{' '}
                  <Link href="/politica-privacidad" className="font-bold text-brand-blue underline" target="_blank">Politica de privacidad</Link>.
                </span>
              </label>
              {errors.consent ? <span className="-mt-2 text-xs font-bold text-red-600">{errors.consent}</span> : null}
              <button className="btn-primary mt-2 w-full" disabled={loading}>
                {loading ? (<><Loader2 size={18} className="mr-2 animate-spin" /> Enviando...</>) : 'Quiero mi 5% de descuento'}
              </button>
              <button type="button" onClick={close} className="text-center text-xs font-bold text-brand-inkSoft/70 hover:text-brand-inkSoft">No, gracias</button>
            </form>
          </>
        ) : (
          <div className="p-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-green/10 text-brand-green">
              <Check size={28} />
            </div>
            <h2 className="mt-4 text-2xl font-black text-brand-ink">Listo! Este es tu cupon</h2>
            <p className="mt-2 text-sm leading-6 text-brand-inkSoft">Usalo en el checkout para obtener 5% de descuento. Valido por 30 dias.</p>
            <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-brand-blue/40 bg-brand-blue/5 px-4 py-3">
              <span className="font-mono text-lg font-black tracking-wide text-brand-dark">{couponCode}</span>
              <button type="button" onClick={copyCode} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-blue px-3 py-2 text-xs font-black text-white transition hover:bg-blue-600">
                {copied ? (<><Check size={14} /> Copiado</>) : (<><Copy size={14} /> Copiar</>)}
              </button>
            </div>
            <Link href="/productos" onClick={close} className="btn-primary mt-6 w-full">Ver catalogo</Link>
          </div>
        )}
      </div>
    </div>
  );
}
