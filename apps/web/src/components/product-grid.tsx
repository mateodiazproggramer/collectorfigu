import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, Blocks, Heart, Scale, ShieldCheck, Truck } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { LimitedEditionBadge } from '@/components/limited-edition-badge';
import { WhatsAppIcon } from '@/components/whatsapp-icon';
import { salesWhatsAppUrl } from '@/lib/whatsapp';
import { shippingEstimate } from '@/lib/product-marketing';
import { cloudinaryThumb } from '@/lib/cloudinary';

export type ProductGridProps = {
  products: any[];
};

function getDiscount(product: any) {
  if (!product.previousPrice || product.previousPrice <= product.price) return null;
  return Math.round(((product.previousPrice - product.price) / product.previousPrice) * 100);
}

function getProductCover(product: any) {
  const generalImages = (product.images ?? [])
    .filter((image: any) => image.variantId === null || image.variantId === undefined || image.variantId === '')
    .sort((a: any, b: any) => Number(b.isMain) - Number(a.isMain) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  if (generalImages[0]?.url) return generalImages[0].url;

  const variantImages = (product.variants ?? [])
    .flatMap((variant: any) => variant.images ?? [])
    .sort((a: any, b: any) => Number(b.isMain) - Number(a.isMain) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return variantImages[0]?.url ?? product.images?.[0]?.url;
}

function ProductVisual({ product }: { product: any }) {
  const image = getProductCover(product);

  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={cloudinaryThumb(image, 480)} alt={product.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />;
  }

  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden bg-brand-dark bg-brand-radial">
      <div className="absolute inset-0 bg-tech-grid bg-[size:34px_34px] opacity-70" />
      <div className="relative grid h-40 w-28 place-items-center rounded-[1.7rem] border border-white/20 bg-white/10 shadow-glow backdrop-blur-xl sm:h-44 sm:w-32 sm:rounded-[2rem]">
        <Blocks size={82} className="text-white" strokeWidth={1.4} />
      </div>
      <div className="absolute bottom-4 left-4 flex gap-1.5" aria-hidden="true">
        <span className="h-1.5 w-8 rounded-full bg-white" />
        <span className="h-1.5 w-5 rounded-full bg-white/45" />
        <span className="h-1.5 w-5 rounded-full bg-white/30" />
      </div>
      <Image src="/brand/collectorfigu-symbol.png" alt="CollectorFigu" width={90} height={90} className="absolute bottom-4 right-4 h-14 w-14 rounded-full border border-white/10 object-cover opacity-80" />
    </div>
  );
}

export function ProductGrid({ products }: ProductGridProps) {
  if (!products?.length) {
    return (
      <div className="rounded-3xl border border-dashed border-brand-blue/30 bg-white p-10 text-center shadow-soft">
        <a href={salesWhatsAppUrl('Catalogo de productos')} target="_blank" rel="noreferrer" className="mb-3 inline-flex items-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white"><WhatsAppIcon size={17} className="mr-2" /> Contactar por WhatsApp</a>
        <p className="mx-auto max-w-md text-slate-600">No pudimos cargar los productos en este momento. Escríbenos por WhatsApp para recibir asesoría.</p>
      </div>
    );
  }

  return (
    <div className="grid min-w-0 grid-cols-2 gap-2.5 sm:gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => {
        const discount = getDiscount(product);
        return (
          <article key={product.id} className="group card relative min-w-0 overflow-hidden rounded-[1.25rem] transition duration-300 hover:-translate-y-1 hover:border-brand-blue/30 hover:shadow-glow sm:rounded-[1.7rem]">
            <div className="absolute right-3 top-3 z-10 hidden gap-2 sm:flex">
              <button aria-label="Comparar producto" className="grid h-8 w-8 place-items-center rounded-full border border-white/50 bg-white/85 text-slate-700 shadow-soft backdrop-blur transition hover:text-brand-blue sm:h-9 sm:w-9">
                <Scale size={15} />
              </button>
              <button aria-label="Guardar producto" className="grid h-8 w-8 place-items-center rounded-full border border-white/50 bg-white/85 text-slate-700 shadow-soft backdrop-blur transition hover:text-brand-blue sm:h-9 sm:w-9">
                <Heart size={15} />
              </button>
            </div>
            {discount ? <div className="absolute left-2 top-2 z-10 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-black text-white sm:left-3 sm:top-3 sm:px-3 sm:text-xs">-{discount}%</div> : null}

            <Link href={`/productos/${product.slug}`} className="block">
              <div className="aspect-square bg-slate-100">
                <ProductVisual product={product} />
              </div>
              <div className="min-w-0 p-2.5 sm:p-5">
                <div className="flex min-w-0 items-center justify-between gap-1.5">
                  <p className="min-w-0 truncate text-[10px] font-black uppercase text-brand-blueInk sm:text-xs sm:tracking-[0.18em]">{product.brand?.name}</p>
                  <LimitedEditionBadge isLimitedEdition={product.isLimitedEdition} />
                </div>
                <h3 className="mt-2 line-clamp-2 min-h-9 text-[13px] font-black leading-tight text-slate-950 sm:mt-3 sm:min-h-12 sm:text-base sm:leading-snug">{product.name}</h3>
                {product.character ? <p className="mt-1 line-clamp-1 text-[11px] font-bold text-brand-blue sm:text-xs">{product.character}</p> : null}
                <div className="mt-2 flex flex-wrap items-end gap-1.5 sm:mt-4 sm:gap-2">
                  <p className="font-mono text-[17px] font-black leading-none text-brand-dark sm:text-2xl">{formatCurrency(product.price)}</p>
                  {product.previousPrice ? <p className="pb-1 font-mono text-xs text-slate-400 line-through">{formatCurrency(product.previousPrice)}</p> : null}
                </div>
                <p className="mt-1 line-clamp-1 text-[11px] font-bold text-emerald-700 sm:text-xs">Pago seguro Wompi</p>
                {product.variants?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1 sm:mt-3 sm:gap-1.5" aria-label="Colores disponibles">
                    {product.variants.slice(0, 4).map((variant: any) => (
                      <span key={variant.id} className="h-3.5 w-3.5 rounded-full border border-slate-200 shadow-sm sm:h-5 sm:w-5" style={{ backgroundColor: variant.colorHex }} title={variant.colorName} />
                    ))}
                    {product.variants.length > 4 ? <span className="text-[10px] font-black text-slate-400 sm:text-xs">+{product.variants.length - 4}</span> : null}
                  </div>
                ) : null}
                <div className="mt-2 grid gap-1 text-[11px] font-semibold text-slate-500 sm:mt-4 sm:gap-2 sm:text-xs">
                  <span className="inline-flex items-center gap-1.5"><Blocks size={13} className="text-brand-blue" /> {product.presentation ?? product.category?.name ?? 'Figura armable'}{product.pieces ? ` · ${product.pieces} piezas` : ''}</span>
                  <span className="inline-flex items-center gap-1.5"><BadgeCheck size={13} className="text-brand-blue" /> {product.inventory?.stock ?? 0} disp.</span>
                </div>
                <div className="mt-2 grid gap-1.5 sm:mt-4">
                  <span className="line-clamp-1 rounded-xl bg-slate-50 px-2 py-1.5 text-[10px] font-bold text-slate-500 sm:text-xs">{shippingEstimate(product)}</span>
                  <span className="inline-flex min-h-9 items-center justify-center rounded-xl bg-brand-cyan px-2 text-[11px] font-black text-brand-dark sm:min-h-11 sm:rounded-2xl sm:text-sm">
                    Realizar pedido
                  </span>
                </div>
                <div className="mt-3 hidden flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-[11px] font-black uppercase tracking-[0.13em] text-slate-500 sm:mt-5 sm:flex">
                  <span className="inline-flex items-center gap-1.5"><Truck size={13} className="text-brand-blue" /> Entrega</span>
                  <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} className="text-brand-blue" /> Compra segura</span>
                </div>
              </div>
            </Link>
          </article>
        );
      })}
    </div>
  );
}
