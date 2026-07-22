import type { Metadata } from 'next';
import { CategoryLanding } from '../(catalogo)/category-landing';

const brands = ['Star Wars', 'Harry Potter', 'Disney', 'Toy Story', 'Stranger Things', 'Simpsons', 'Looney Tunes'];

export const metadata: Metadata = {
  title: 'Figuras de Películas y Series',
  description: 'Figuras armables de Star Wars, Harry Potter, Disney, Toy Story, Stranger Things, Simpsons y Looney Tunes. Compatibles con bloques tipo LEGO.',
  alternates: { canonical: '/peliculas-series' },
};

export default function PeliculasSeriesPage() {
  return (
    <CategoryLanding
      eyebrow="Películas y series"
      title="Figuras armables de tus películas y series favoritas"
      description="Star Wars, Harry Potter, Disney, Toy Story, Stranger Things, Simpsons y Looney Tunes en version armable, compatible con bloques tipo LEGO."
      brands={brands}
    />
  );
}
