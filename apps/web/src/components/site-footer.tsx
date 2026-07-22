import Link from 'next/link';
import { Facebook, Instagram, Mail, MapPin, Sparkles } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { WhatsAppIcon } from '@/components/whatsapp-icon';
import { COMPANY_CONTACT, PRODUCT_LINES } from '@/lib/company';
import { salesWhatsAppUrl } from '@/lib/whatsapp';

export function SiteFooter() {
  return (
    <footer className="bg-brand-dark text-white">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.3fr_.8fr_.8fr_.8fr]">
        <div>
          <BrandLogo className="h-16 w-auto" />
          <p className="mt-5 max-w-sm text-sm leading-6 text-white/60">
            Convertimos a tus personajes favoritos en piezas para tener, regalar y presumir: minifiguras, cuadros personalizados, llaveros y sets, con envíos a toda Colombia.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-gold/30 bg-brand-gold/10 px-4 py-2 text-xs font-bold text-brand-gold">
              <Sparkles size={15} /> Nuevas figuras cada semana
            </div>
            <a href={COMPANY_CONTACT.catalogUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white/70 transition hover:border-brand-gold/40 hover:text-brand-gold">
              Catálogo completo en Treinta
            </a>
          </div>
        </div>
        <div>
          <h3 className="font-black">Nuestras líneas</h3>
          <div className="mt-4 grid gap-3 text-sm text-white/60">
            {PRODUCT_LINES.map((line) => (
              <Link key={line.name} href={`/productos?category=${encodeURIComponent(line.name)}`}>{line.title}</Link>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-black">Soporte</h3>
          <div className="mt-4 grid gap-3 text-sm text-white/60">
            <Link href="/sobre-nosotros">Sobre nosotros</Link>
            <Link href="/garantia">Garantia</Link>
            <Link href="/envios">Envios</Link>
            <Link href="/carrito">Carrito</Link>
            <Link href="/checkout">Finalizar compra</Link>
          </div>
        </div>
        <div>
          <h3 className="font-black">Contacto</h3>
          <div className="mt-4 grid gap-3 text-sm text-white/60">
            <span className="inline-flex items-center gap-2"><MapPin size={15} /> Bogotá, Colombia</span>
            <a href={salesWhatsAppUrl('Footer del sitio')} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 transition hover:text-emerald-300"><WhatsAppIcon size={15} /> WhatsApp comercial</a>
            <a href={`mailto:${COMPANY_CONTACT.supportEmail}`} className="inline-flex items-center gap-2 transition hover:text-brand-cyan"><Mail size={15} /> {COMPANY_CONTACT.supportEmail}</a>
            <a href={COMPANY_CONTACT.instagramUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 transition hover:text-pink-300"><Instagram size={15} /> {COMPANY_CONTACT.instagramHandle}</a>
            <a href={COMPANY_CONTACT.facebookUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 transition hover:text-blue-300"><Facebook size={15} /> {COMPANY_CONTACT.facebookLabel}</a>
          </div>
        </div>
      </div>
      <div className="container-page border-t border-white/10 py-5">
        <nav className="flex flex-wrap justify-center gap-4 text-xs font-semibold text-white/50">
          <Link href="/terminos-condiciones">Terminos</Link>
          <Link href="/politica-privacidad">Privacidad</Link>
          <Link href="/cambios-devoluciones">Cambios y devoluciones</Link>
          <Link href="/contacto">Contacto</Link>
        </nav>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/40">
        © {new Date().getFullYear()} CollectorFigu. Figuras coleccionables armables para cada fandom, hechas con Next.js, NestJS, PostgreSQL y Wompi.
      </div>
    </footer>
  );
}
