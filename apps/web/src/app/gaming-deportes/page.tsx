import type { Metadata } from 'next';
import { CategoryLanding } from '../(catalogo)/category-landing';

const brands = ['Minecraft', 'League of Legends', 'Deportes'];

export const metadata: Metadata = {
  title: 'Figuras de Gaming y Deportes',
  description: 'Figuras armables de Minecraft, League of Legends, futbol, basketball y WWE. Compatibles con bloques tipo LEGO, envios a toda Colombia.',
  alternates: { canonical: '/gaming-deportes' },
};

export default function GamingDeportesPage() {
  return (
    <CategoryLanding
      eyebrow="Gaming y deportes"
      title="Figuras armables gamer y deportivas"
      description="Steve y Creeper de Minecraft, campeones de League of Legends y figuras de futbol, basketball y WWE, todas en version armable compatible con bloques tipo LEGO."
      brands={brands}
    />
  );
}
