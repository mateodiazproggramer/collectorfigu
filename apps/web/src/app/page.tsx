import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Blocks, Boxes, CheckCircle2, Frame, Gift, Key, MessageCircle, PackageCheck, ShoppingCart, Sparkles } from 'lucide-react';
import { ProductGrid } from '@/components/product-grid';
import { TrustStrip } from '@/components/trust-strip';
import { WhatsAppIcon } from '@/components/whatsapp-icon';
import { BUSINESS_PROOF, COMPANY_CONTACT, PRODUCT_LINES } from '@/lib/company';
import { getProducts } from '@/lib/api';
import { salesWhatsAppUrl, specialOrderWhatsAppUrl } from '@/lib/whatsapp';

export const metadata: Metadata = {
  title: 'Minifiguras, cuadros personalizados, llaveros y sets coleccionables',
  description: 'CollectorFigu convierte a tus personajes favoritos en piezas para tener, regalar y presumir: minifiguras, cuadros personalizados, llaveros y sets. 100% hecho en Colombia, envios a toda Colombia.',
  alternates: { canonical: '/' },
};

const franchiseHighlights = [
  { title: 'Anime', href: '/anime', description: 'Dragon Ball, Naruto, One Piece, Demon Slayer y Caballeros del Zodiaco.' },
  { title: 'Superhéroes', href: '/superheroes', description: 'Marvel y DC: Spider-Man, Batman, Iron Man, Joker y mas.' },
  { title: 'Películas y series', href: '/peliculas-series', description: 'Star Wars, Harry Potter, Disney, Stranger Things y mas.' },
  { title: 'Gaming y deportes', href: '/gaming-deportes', description: 'Minecraft, League of Legends, futbol, basketball y WWE.' },
];

const lineIcons = { 'Minifiguras únicas': Blocks, 'Cuadros personalizados': Frame, 'Llaveros': Key, 'Funkos & Sets': Boxes } as const;

const howToBuySteps = [
  { icon: Sparkles, title: 'Elige tu figura', text: 'Explora por franquicia o personaje y arma tu coleccion.' },
  { icon: ShoppingCart, title: 'Agrega al carrito o pide por WhatsApp', text: 'Compra directo en el sitio o escribenos para asesoria.' },
  { icon: PackageCheck, title: 'Recibela en toda Colombia', text: 'Pago seguro y envio a tu ciudad con seguimiento.' },
];

export default async function HomePage() {
  const featuredProducts = await getProducts({ limit: 16, available: true, featured: true, sort: 'smart' });
  const fallbackProducts = featuredProducts.items?.length ? null : await getProducts({ limit: 16, available: true, sort: 'smart' });
  const products = featuredProducts.items?.length ? featuredProducts : fallbackProducts;

  return (
    <main>
      <section className="relative overflow-hidden bg-brand-dark text-white">
        <div className="absolute inset-0 bg-brand-radial" />
        <div className="absolute inset-0 bg-tech-grid bg-[size:42px_42px] opacity-50" />
        <div className="container-page relative grid items-center gap-8 py-8 md:py-10 lg:min-h-[620px] lg:grid-cols-[1.05fr_.95fr] lg:py-12">
          <div>
            <p className="badge-brand">El que colecciona, entiende</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
              Algunas historias están hechas para durar. <span className="brand-gradient-text">Tenlas en tus manos.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/70 md:text-lg">
              Convertimos a tus personajes favoritos en piezas para tener, regalar y presumir: minifiguras, cuadros personalizados, llaveros y sets, de Star Wars al anime, del gaming al fútbol. 100% hecho en Colombia, con envíos a toda Colombia.
            </p>
            <form action="/productos" className="mt-6 max-w-2xl rounded-[1.7rem] border border-white/10 bg-white/10 p-2 shadow-glow backdrop-blur-xl sm:flex">
              <input name="q" placeholder="Busca por personaje, franquicia o set..." className="min-h-14 flex-1 rounded-2xl bg-transparent px-5 text-sm font-semibold text-white outline-none placeholder:text-white/40" />
              <button className="btn-primary w-full sm:w-auto" type="submit">Buscar figuras <ArrowRight size={18} className="ml-2" /></button>
            </form>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/productos" className="btn-primary">Ver catálogo completo</Link>
              <a href={salesWhatsAppUrl('Inicio del sitio')} target="_blank" rel="noreferrer" className="btn-secondary"><WhatsAppIcon size={18} className="mr-2" /> Realizar pedido por WhatsApp</a>
            </div>
            <div className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-2">
              {BUSINESS_PROOF.slice(0, 4).map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                  <p className="inline-flex items-center gap-2 text-sm font-black text-white"><CheckCircle2 size={16} className="text-brand-gold" /> {item.label}</p>
                  <p className="mt-1 text-xs leading-5 text-white/55">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="brand-panel relative overflow-hidden rounded-[2.3rem] p-6">
              <Image src="/brand/collectorfigu-logo-hero.png" alt="CollectorFigu" width={820} height={820} priority className="w-full rounded-[1.7rem] object-cover shadow-2xl" />
            </div>
          </div>
        </div>
      </section>

      <TrustStrip />

      <section className="container-page py-8 md:py-10">
        <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-brand-blueInk">Nuestras 4 líneas</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Un mismo insight: no compras una figura, compras lo que amas</h2>
            <p className="mt-2 max-w-2xl text-slate-600">Minifiguras, cuadros personalizados, llaveros y sets — cada línea con su propio rol, todas con tus personajes favoritos.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCT_LINES.map((line) => {
            const Icon = lineIcons[line.name as keyof typeof lineIcons];
            return (
              <Link key={line.name} href={`/productos?category=${encodeURIComponent(line.name)}`} className="group rounded-[1.75rem] border border-brand-line bg-white p-5 shadow-soft transition hover:-translate-y-1 hover:border-brand-pop/40 hover:shadow-glow">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-brand-pop">{line.eyebrow}</p>
                <div className="mt-3 inline-flex rounded-2xl bg-brand-violet/10 p-3 text-brand-violet transition group-hover:bg-brand-violet group-hover:text-white">
                  <Icon size={22} />
                </div>
                <h3 className="mt-4 text-lg font-black text-slate-950">{line.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{line.description}</p>
                <p className="mt-3 font-mono text-xs font-bold text-brand-violet">{line.price}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="container-page py-8 md:py-10">
        <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-brand-blueInk">Explora por fandom</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Cada franquicia, su propia coleccion</h2>
            <p className="mt-2 max-w-2xl text-slate-600">Encuentra tus personajes favoritos organizados por franquicia, no por listados genericos.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {franchiseHighlights.map((franchise) => (
            <Link key={franchise.href} href={franchise.href} className="group rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-1 hover:border-brand-blue/30 hover:shadow-glow">
              <div className="inline-flex rounded-2xl bg-brand-blue/10 p-3 text-brand-blue transition group-hover:bg-brand-blue group-hover:text-white">
                <Blocks size={22} />
              </div>
              <h3 className="mt-4 text-lg font-black text-slate-950">{franchise.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{franchise.description}</p>
              <span className="mt-4 inline-flex items-center text-xs font-black uppercase tracking-[0.14em] text-brand-blue">Ver figuras <ArrowRight size={14} className="ml-1" /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page py-8 md:py-10">
        <div className="rounded-[2rem] border border-brand-blue/15 bg-white p-5 shadow-soft md:p-7">
          <div className="grid gap-5 md:grid-cols-[1fr_1.1fr] md:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-brand-blueInk">Como comprar</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">De la busqueda al paquete en tu puerta</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
                Compra segura, pagos por Wompi, transferencia o contraentrega, y asesoria directa por WhatsApp e Instagram antes de finalizar tu pedido.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {howToBuySteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="rounded-2xl bg-slate-50 p-4">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue/10 text-xs font-black text-brand-blue">{index + 1}</span>
                    <Icon size={20} className="mt-3 text-brand-blue" />
                    <p className="mt-2 text-sm font-black text-slate-900">{step.title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{step.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-8 md:py-10">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-soft lg:grid lg:grid-cols-[.95fr_1.05fr]">
          <div className="relative flex min-h-64 items-center justify-center overflow-hidden bg-brand-dark bg-brand-radial p-10 lg:min-h-full">
            <div className="absolute inset-0 bg-tech-grid bg-[size:40px_40px] opacity-60" />
            <Gift size={140} className="relative text-brand-cyan" strokeWidth={1.2} />
            <div className="absolute left-5 top-5 inline-flex items-center rounded-full bg-brand-cyan px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-brand-dark">
              <Sparkles size={15} className="mr-2" /> Pedidos especiales
            </div>
          </div>

          <div className="grid content-center gap-5 p-6 md:p-8 lg:p-10">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-brand-blueInk">No lo encuentras en el catalogo?</p>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Armamos tu pedido especial</h2>
            <p className="max-w-xl text-base leading-7 text-slate-600">
              Personajes que no estan en el catalogo por el momento, sets de regalo personalizados y pedidos al por mayor para eventos. Cuentanos que necesitas.
            </p>
            <div className="grid gap-3 text-sm font-semibold text-slate-600 sm:grid-cols-3">
              <span className="rounded-2xl bg-slate-50 p-3">Personaje especifico</span>
              <span className="rounded-2xl bg-slate-50 p-3">Set de regalo</span>
              <span className="rounded-2xl bg-slate-50 p-3">Pedido al por mayor</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href={specialOrderWhatsAppUrl()} target="_blank" rel="noreferrer" className="btn-primary w-full sm:w-fit">
                <WhatsAppIcon size={18} className="mr-2" /> Escribir por WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-8 md:py-10">
        <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-brand-blueInk">Inventario destacado</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Nuevo en la colección</h2>
            <p className="mt-2 max-w-2xl text-slate-600">Figuras destacadas de distintos fandoms, con precio claro, existencias, envio y compra segura.</p>
          </div>
          <Link href="/productos" className="btn-light">Ver todo el catalogo</Link>
        </div>
        <ProductGrid products={products?.items ?? []} />
        {products?.unavailable ? (
          <div className="mt-6 rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-800">
            No pudimos cargar los productos en este momento. Escríbenos por WhatsApp para recibir asesoría.
          </div>
        ) : null}
      </section>

      <section className="container-page pb-10">
        <div className="rounded-[2rem] bg-brand-dark bg-brand-radial p-6 text-white shadow-glow md:flex md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-gold">También vendemos por Instagram</p>
            <h2 className="mt-2 text-2xl font-black">Tu personaje favorito, en tus manos</h2>
            <p className="mt-2 text-sm text-white/60">Sigue a {COMPANY_CONTACT.instagramHandle} para ver las novedades de cada semana, o mira el catálogo completo en Treinta.</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 md:mt-0">
            <a href={COMPANY_CONTACT.instagramUrl} target="_blank" rel="noreferrer" className="btn-secondary"><MessageCircle size={18} className="mr-2" /> Ver Instagram</a>
            <a href={COMPANY_CONTACT.catalogUrl} target="_blank" rel="noreferrer" className="btn-secondary">Ver catálogo en Treinta</a>
            <a href={salesWhatsAppUrl()} target="_blank" rel="noreferrer" className="btn-primary"><WhatsAppIcon size={18} className="mr-2" /> Realizar pedido</a>
          </div>
        </div>
      </section>
    </main>
  );
}
