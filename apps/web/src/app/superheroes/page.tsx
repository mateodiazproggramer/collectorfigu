import type { Metadata } from 'next';
import { CategoryLanding } from '../(catalogo)/category-landing';

const brands = ['Marvel', 'DC'];

export const metadata: Metadata = {
  title: 'Figuras de Superhéroes',
  description: 'Figuras armables de Marvel y DC: Spider-Man, Batman, Iron Man, Joker y mas. Compatibles con bloques tipo LEGO, envios a toda Colombia.',
  alternates: { canonical: '/superheroes' },
};

export default function SuperheroesPage() {
  return (
    <CategoryLanding
      eyebrow="Superhéroes"
      title="Figuras armables Marvel y DC"
      description="Spider-Man, Iron Man, Batman, Joker y muchos mas heroes y villanos en version armable, compatible con bloques tipo LEGO."
      brands={brands}
    />
  );
}
