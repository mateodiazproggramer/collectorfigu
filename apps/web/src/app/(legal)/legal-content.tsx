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
      <section className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-5">
          {sections.map((section) => (
            <article key={section.title} className="card p-6">
              <h2 className="text-2xl font-black text-slate-950">{section.title}</h2>
              <div className="mt-4 grid gap-3 text-sm leading-7 text-slate-600">
                {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </article>
          ))}
        </div>
        <aside className="h-fit rounded-[2rem] bg-slate-50 p-6">
          <h2 className="font-black text-slate-950">Datos de la tienda</h2>
          <div className="mt-4 grid gap-2 text-sm text-slate-600">
            <p>Nombre comercial: {COMPANY_CONTACT.businessName}</p>
            <p>NIT: {COMPANY_CONTACT.nit}</p>
            <p>Ubicacion: {COMPANY_CONTACT.locationDisplay}</p>
            <p>Entrega/recogida: {COMPANY_CONTACT.addressDisplay}</p>
            <p>Correo: {COMPANY_CONTACT.supportEmail}</p>
            <p>Telefono: {COMPANY_CONTACT.whatsappDisplay}</p>
          </div>
          <Link href="/contacto" className="btn-primary mt-5 w-full">Contactar</Link>
        </aside>
      </section>
    </main>
  );
}
