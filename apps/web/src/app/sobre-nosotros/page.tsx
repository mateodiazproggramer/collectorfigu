import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, Blocks, CreditCard, Gift, ShieldCheck, Sparkles } from 'lucide-react';
import { BUSINESS_PROOF, COMPANY_CONTACT } from '@/lib/company';

export const metadata: Metadata = {
  title: 'Sobre CollectorFigu',
  description: 'Conoce CollectorFigu: minifiguras, cuadros personalizados, llaveros y sets con tus personajes favoritos, hechos en Colombia, con envios a toda Colombia.',
  alternates: { canonical: '/sobre-nosotros' },
};

// Rotacion de color de marca (violeta, oro, verde, coral) para que la franja de pruebas de negocio
// no se lea monocromatica, igual que trust-strip.tsx.
const proofAccents = [
  { chipBg: 'bg-brand-violet/10', chipText: 'text-brand-violet' },
  { chipBg: 'bg-brand-gold/10', chipText: 'text-brand-gold' },
  { chipBg: 'bg-brand-green/10', chipText: 'text-brand-green' },
  { chipBg: 'bg-brand-pop/10', chipText: 'text-brand-pop' },
];

export default function SobreNosotrosPage() {
  return (
    <main>
      <section className="bg-brand-dark bg-brand-radial text-white">
        <div className="container-page py-14">
          <p className="badge-brand">El que colecciona, entiende</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">Convertimos lo que amas en algo que se puede tener.</h1>
          <p className="mt-5 max-w-3xl text-white/65">
            CollectorFigu es una tienda de Bogotá dedicada a minifiguras coleccionables, cuadros personalizados, llaveros y Funkos &amp; Sets, de casi cualquier fandom: anime, superhéroes, películas, series, gaming y deporte. 100% hecho en Colombia, con envíos a toda Colombia.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/productos" className="btn-primary">Ver productos</Link>
            <Link href="/contacto" className="btn-secondary">Contactar</Link>
          </div>
        </div>
      </section>

      <section className="container-page grid gap-5 py-10 md:grid-cols-2 lg:grid-cols-4">
        {BUSINESS_PROOF.map((item, index) => {
          const accent = proofAccents[index % proofAccents.length];
          return (
            <article key={item.label} className="card p-5 transition hover:-translate-y-0.5 hover:shadow-glow">
              <div className={`inline-flex rounded-2xl p-3 ${accent.chipBg} ${accent.chipText}`}>
                <Sparkles size={20} />
              </div>
              <h2 className="mt-4 font-black">{item.label}</h2>
              <p className="mt-2 text-sm leading-6 text-brand-inkSoft">{item.text}</p>
            </article>
          );
        })}
      </section>

      <section className="container-page grid gap-6 pb-10 lg:grid-cols-[1fr_.9fr]">
        <div className="card p-6">
          <h2 className="text-2xl font-black text-brand-ink">Como compramos con confianza</h2>
          <div className="mt-5 grid gap-3 text-sm leading-7 text-brand-inkSoft">
            <p><ShieldCheck size={17} className="mr-2 inline text-brand-green" /> Existencias validadas antes de confirmar tu pedido.</p>
            <p><BadgeCheck size={17} className="mr-2 inline text-brand-violet" /> Catalogo organizado por franquicia y personaje.</p>
            <p><CreditCard size={17} className="mr-2 inline text-brand-gold" /> Pagos por Wompi, transferencia o contraentrega segun cobertura.</p>
            <p><Blocks size={17} className="mr-2 inline text-brand-pop" /> Figuras compatibles con bloques tipo LEGO y otras marcas de bloques.</p>
            <p><Gift size={17} className="mr-2 inline text-brand-violet" /> Pedidos especiales: personajes fuera de catalogo, sets de regalo y pedidos al por mayor.</p>
          </div>
        </div>

        <aside className="rounded-[2rem] bg-brand-paper2 p-6">
          <h2 className="text-2xl font-black text-brand-ink">Datos de contacto</h2>
          <div className="mt-5 grid gap-3 text-sm text-brand-inkSoft">
            <p><strong>Nombre comercial:</strong> {COMPANY_CONTACT.businessName}</p>
            <p><strong>Ubicacion:</strong> {COMPANY_CONTACT.locationDisplay}</p>
            <p><strong>Instagram:</strong> {COMPANY_CONTACT.instagramHandle}</p>
            <p><strong>Soporte:</strong> {COMPANY_CONTACT.supportEmail}</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
