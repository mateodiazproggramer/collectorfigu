import Link from 'next/link';
import { COMPANY_CONTACT } from '@/lib/company';

type LegalContentProps = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: Array<{ title: string; body: string[] }>;
};

export function LegalContent({ eyebrow, title, intro, sections }: LegalContentProps) {
  return (
    <main>
      <section className="bg-brand-dark bg-brand-radial text-white">
        <div className="container-page py-14">
          <p className="badge-brand">{eyebrow}</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-white/65">{intro}</p>
        </div>
      </section>
      <section className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="grid gap-5">
          {sections.map((section, index) => (
            <article key={section.title} className="card p-6 sm:p-7">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs font-black text-brand-violet/60">{String(index + 1).padStart(2, '0')}</span>
                <h2 className="text-xl font-black text-brand-ink sm:text-2xl">{section.title}</h2>
              </div>
              <div className="mt-4 grid max-w-[68ch] gap-4 text-sm leading-7 text-brand-inkSoft">
                {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </article>
          ))}
        </div>
        <aside className="h-fit rounded-[2rem] border border-brand-line bg-brand-paper2 p-6 lg:sticky lg:top-28">
          <h2 className="font-black text-brand-ink">Datos de la tienda</h2>
          <div className="mt-4 grid gap-3 text-sm text-brand-inkSoft">
            <p className="border-b border-brand-line/60 pb-3">Nombre comercial: <span className="font-bold text-brand-ink">{COMPANY_CONTACT.businessName}</span></p>
            <p className="border-b border-brand-line/60 pb-3">NIT: <span className="font-bold text-brand-ink">{COMPANY_CONTACT.nit}</span></p>
            <p className="border-b border-brand-line/60 pb-3">Ubicacion: <span className="font-bold text-brand-ink">{COMPANY_CONTACT.locationDisplay}</span></p>
            <p className="border-b border-brand-line/60 pb-3">Entrega/recogida: <span className="font-bold text-brand-ink">{COMPANY_CONTACT.addressDisplay}</span></p>
            <p className="border-b border-brand-line/60 pb-3">Correo: <span className="font-bold text-brand-ink">{COMPANY_CONTACT.supportEmail}</span></p>
            <p>Telefono: <span className="font-bold text-brand-ink">{COMPANY_CONTACT.whatsappDisplay}</span></p>
          </div>
          <Link href="/contacto" className="btn-primary mt-5 w-full">Contactar</Link>
        </aside>
      </section>
    </main>
  );
}
