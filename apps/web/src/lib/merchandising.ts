import {
  BadgeCheck,
  Blocks,
  CreditCard,
  Frame,
  Gift,
  Key,
  Package,
  Sparkles,
  Star,
  Swords,
  Truck,
} from 'lucide-react';

export const brandFilters = [
  'Dragon Ball',
  'Naruto',
  'One Piece',
  'Demon Slayer',
  'Marvel',
  'DC',
  'Star Wars',
  'Harry Potter',
  'Minecraft',
  'League of Legends',
];

export const budgetRanges = [
  { label: 'Hasta $15.000', href: '/productos?maxPrice=15000', helper: 'Figuras individuales de entrada, ideales para empezar tu coleccion' },
  { label: '$15.000 a $25.000', href: '/productos?minPrice=15000&maxPrice=25000', helper: 'Figuras individuales y llaveros armables' },
  { label: '$25.000 a $50.000', href: '/productos?minPrice=25000&maxPrice=50000', helper: 'Decoracion de pared y sets pequenos' },
  { label: 'Mas de $50.000', href: '/productos?minPrice=50000', helper: 'Cuadros personalizados, sets y Funkos para coleccionistas' },
];

export const shoppingNeeds = [
  { icon: Sparkles, label: 'Novedades', href: '/productos?sort=featured', description: 'Las ultimas piezas que llegaron al catalogo.' },
  { icon: Frame, label: 'Cuadros personalizados', href: `/productos?category=${encodeURIComponent('Cuadros personalizados')}`, description: 'Elige tus personajes y arma el regalo perfecto.' },
  { icon: Key, label: 'Llaveros', href: `/productos?category=${encodeURIComponent('Llaveros')}`, description: 'Ideales para mochilas, regalos y detalles.' },
  { icon: Package, label: 'Funkos & Sets', href: `/productos?category=${encodeURIComponent('Funkos & Sets')}`, description: 'Para el fan que ya sabe lo que quiere.' },
  { icon: Star, label: 'Ediciones limitadas', href: '/productos?need=limited', description: 'Piezas especiales de temporada y coleccion.' },
  { icon: Gift, label: 'Ideal para regalo', href: '/productos?need=regalo', description: 'Sets y figuras listas para sorprender.' },
  { icon: Swords, label: 'Anime y superheroes', href: '/anime', description: 'Los fandoms mas pedidos del catalogo.' },
];

// Cada beneficio tiene un color de marca distinto (violeta, oro, verde, coral) para que la franja
// de confianza no se lea monocromatica. Las clases son literales para que el JIT de Tailwind las detecte.
export const trustBenefits = [
  { icon: Truck, title: 'Envío a toda Colombia', text: 'Domicilio, contraentrega según ciudad y opción de recogida.', chipBg: 'bg-brand-violet/10', chipText: 'text-brand-violet', chipHoverBg: 'group-hover:bg-brand-violet', hoverSurface: 'hover:bg-brand-violet/5' },
  { icon: CreditCard, title: 'Pagos seguros', text: 'Wompi, transferencia bancaria y pago contraentrega.', chipBg: 'bg-brand-gold/10', chipText: 'text-brand-gold', chipHoverBg: 'group-hover:bg-brand-gold', hoverSurface: 'hover:bg-brand-gold/5' },
  { icon: BadgeCheck, title: 'Compra protegida', text: 'Validamos existencias antes de confirmar tu pedido.', chipBg: 'bg-brand-green/10', chipText: 'text-brand-green', chipHoverBg: 'group-hover:bg-brand-green', hoverSurface: 'hover:bg-brand-green/5' },
  { icon: Blocks, title: 'Colecciona por franquicia', text: 'Arma el set completo con nuevas figuras cada semana.', chipBg: 'bg-brand-pop/10', chipText: 'text-brand-pop', chipHoverBg: 'group-hover:bg-brand-pop', hoverSurface: 'hover:bg-brand-pop/5' },
];

export const productHighlights = [
  { icon: BadgeCheck, label: 'Existencias verificadas' },
  { icon: Blocks, label: 'Compatible con bloques tipo LEGO' },
  { icon: Sparkles, label: 'Nuevas figuras cada semana' },
  { icon: Package, label: 'Compra protegida' },
];

export const benchmarkPrinciples = [
  'Busqueda visible desde el encabezado, como las plataformas lideres de coleccionables.',
  'Compra por franquicia y por personaje para reducir friccion en el catalogo.',
  'Filtros priorizados: franquicia, personaje, presentacion, piezas, precio y disponibilidad.',
  'Tarjetas con precio, precio anterior, descuento, presentacion, existencias, envio y senales de confianza.',
  'Compra corta con pasos visibles y resumen persistente.',
  'Compra por WhatsApp e Instagram como diferenciador frente a catalogos genericos.',
];

export const topSegments = [
  { title: 'Figuras desde $15.000', href: '/productos?maxPrice=18000', value: 'Precio de impulso', icon: Sparkles },
  { title: 'Sets completos', href: '/productos?need=sets', value: 'Colecciona el set completo', icon: Package },
  { title: 'Llaveros armables', href: '/productos?need=llaveros', value: 'Para mochilas y regalos', icon: Key },
  { title: 'Ediciones limitadas', href: '/productos?need=limited', value: 'Piezas de temporada', icon: Star },
];
