import Link from 'next/link';
import { trustBenefits } from '@/lib/merchandising';
import { BRAND_TRUST_STATS } from '@/lib/company';

export function TrustStrip() {
  return (
    <section className="border-y border-brand-line bg-white">
      {/* Cifras de confianza reales del manual de marca: seguidores, piezas publicadas y hecho en Colombia. */}
      <div className="border-b border-brand-line bg-brand-paper2">
        <div className="container-page grid grid-cols-2 gap-3 py-4 sm:grid-cols-4">
          {BRAND_TRUST_STATS.map((stat) => (
            <div key={stat.label} className="text-center sm:text-left">
              <p className="font-display text-xl font-extrabold text-brand-ink sm:text-2xl">{stat.value}</p>
              <p className="text-xs font-semibold text-brand-inkSoft">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="container-page grid gap-3 py-4 sm:grid-cols-2 lg:grid-cols-4">
        {trustBenefits.map((benefit) => {
          const Icon = benefit.icon;
          return (
            <Link href="/productos" key={benefit.title} className={`group flex items-start gap-3 rounded-2xl px-3 py-2 transition ${benefit.hoverSurface}`}>
              <span className={`rounded-2xl p-2 transition group-hover:text-white ${benefit.chipBg} ${benefit.chipText} ${benefit.chipHoverBg}`}>
                <Icon size={20} />
              </span>
              <span>
                <strong className="block text-sm text-brand-ink">{benefit.title}</strong>
                <span className="mt-1 block text-xs leading-5 text-brand-inkSoft">{benefit.text}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
