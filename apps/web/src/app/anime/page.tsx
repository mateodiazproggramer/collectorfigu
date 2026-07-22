import type { Metadata } from 'next';
import { CategoryLanding } from '../(catalogo)/category-landing';

const brands = ['Dragon Ball', 'Naruto', 'One Piece', 'Demon Slayer', 'Caballeros del Zodiaco'];

export const metadata: Metadata = {
  title: 'Figuras de Anime',
  description: 'Figuras armables de Dragon Ball, Naruto, One Piece, Demon Slayer y Caballeros del Zodiaco. Compatibles con bloques tipo LEGO, envios a toda Colombia.',
  alternates: { canonical: '/anime' },
};

export default function AnimePage() {
  return (
    <CategoryLanding
      eyebrow="Anime"
      title="Figuras armables de tus animes favoritos"
      description="Dragon Ball, Naruto, One Piece, Demon Slayer y Caballeros del Zodiaco en version armable, compatible con bloques tipo LEGO. Arma tu coleccion personaje por personaje."
      brands={brands}
    />
  );
}
