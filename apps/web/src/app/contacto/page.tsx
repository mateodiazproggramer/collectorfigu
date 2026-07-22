import type { Metadata } from 'next';
import Link from 'next/link';
import { Facebook, Instagram, Mail, MapPin, Phone } from 'lucide-react';
import { WhatsAppIcon } from '@/components/whatsapp-icon';
import { COMPANY_CONTACT } from '@/lib/company';
import { salesWhatsAppUrl } from '@/lib/whatsapp';

export const metadata: Metadata = { title: 'Contacto', description: 'Canales de contacto para ventas, pedidos especiales y seguimiento de pedidos con CollectorFigu.' };

export default function ContactoPage() {
  return (
    <main>
      <section className="bg-brand-dark bg-brand-radial text-white">
        <div className="container-page py-14">
          <p className="badge-brand">Contacto</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">Hablemos de tu compra o pedido especial</h1>
          <p className="mt-4 max-w-3xl text-white/65">Usa los canales oficiales para compras, envios, pedidos especiales y seguimiento de pedidos.</p>
        </div>
      </section>
      <section className="container-page grid gap-5 py-10 md:grid-cols-2 lg:grid-cols-3">
        <Link href={salesWhatsAppUrl('Pagina de contacto')} target="_blank" rel="noreferrer" className="card p-6 transition hover:-translate-y-0.5 hover:border-emerald-200"><WhatsAppIcon size={26} className="text-emerald-600" /><h2 className="mt-4 font-black">WhatsApp</h2><p className="mt-2 text-sm text-slate-600">{COMPANY_CONTACT.whatsappDisplay}</p></Link>
        <a href={`mailto:${COMPANY_CONTACT.supportEmail}`} className="card p-6 transition hover:-translate-y-0.5 hover:border-brand-blue/30"><Mail className="text-brand-blue" /><h2 className="mt-4 font-black">Correo</h2><p className="mt-2 text-sm text-slate-600">{COMPANY_CONTACT.supportEmail}</p></a>
        <a href={COMPANY_CONTACT.instagramUrl} target="_blank" rel="noreferrer" className="card p-6 transition hover:-translate-y-0.5 hover:border-pink-200"><Instagram className="text-pink-500" /><h2 className="mt-4 font-black">Instagram</h2><p className="mt-2 text-sm text-slate-600">{COMPANY_CONTACT.instagramHandle}</p></a>
        <a href={COMPANY_CONTACT.facebookUrl} target="_blank" rel="noreferrer" className="card p-6 transition hover:-translate-y-0.5 hover:border-blue-200"><Facebook className="text-blue-600" /><h2 className="mt-4 font-black">Facebook</h2><p className="mt-2 text-sm text-slate-600">{COMPANY_CONTACT.facebookLabel}</p></a>
        <div className="card p-6"><MapPin className="text-brand-blue" /><h2 className="mt-4 font-black">Ubicacion</h2><p className="mt-2 text-sm text-slate-600">{COMPANY_CONTACT.locationDisplay}</p><p className="mt-2 text-xs font-semibold text-slate-500">{COMPANY_CONTACT.addressDisplay}</p></div>
        <div className="card p-6"><Phone className="text-brand-blue" /><h2 className="mt-4 font-black">Horario</h2><p className="mt-2 text-sm text-slate-600">{COMPANY_CONTACT.hoursDisplay}</p></div>
      </section>
    </main>
  );
}
