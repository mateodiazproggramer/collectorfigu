import { formatCurrency } from '@/lib/format';

export function presentationLabel(product: any) {
  return product?.presentation || product?.category?.name || 'Figura armable';
}

export function piecesLabel(product: any) {
  const pieces = Number(product?.pieces ?? 0);
  if (Number.isFinite(pieces) && pieces > 0) return `${pieces} piezas`;
  const categoryName = product?.category?.name ?? '';
  if (categoryName === 'Cuadros personalizados') return 'Pieza única personalizada';
  if (categoryName === 'Funkos & Sets') return 'Pieza de colección';
  return 'Piezas por confirmar';
}

export function shippingEstimate(productOrSubtotal: any) {
  const value = typeof productOrSubtotal === 'number' ? productOrSubtotal : Number(productOrSubtotal?.price ?? 0);
  if (value > 60000) return 'Envio estimado incluido segun cobertura';
  return `Envio estimado desde ${formatCurrency(9000)} segun ciudad`;
}

export function deliveryEstimate(productOrSubtotal: any) {
  const value = typeof productOrSubtotal === 'number' ? productOrSubtotal : Number(productOrSubtotal?.price ?? 0);
  if (value > 60000) return 'Pide hoy y recibe en 2 a 4 dias habiles segun tu ciudad';
  return 'Pide hoy y recibe en 3 a 6 dias habiles segun tu ciudad';
}

// ---- Color por linea de producto (manual de marca CF-06) ----
// Cada una de las 4 lineas oficiales tiene un color de acento fijo que se repite
// en chips, barras de acento y ribbons en todo el sitio (home, grid, ficha de producto).
export type ProductLineColor = 'violet' | 'pop' | 'gold' | 'green';

const PRODUCT_LINE_COLOR_MAP: Record<string, ProductLineColor> = {
  'Minifiguras únicas': 'violet',
  'Cuadros personalizados': 'pop',
  'Llaveros': 'gold',
  'Funkos & Sets': 'green',
};

export function productLineColor(categoryName?: string | null): ProductLineColor {
  return PRODUCT_LINE_COLOR_MAP[categoryName ?? ''] ?? 'violet';
}

// Clases Tailwind completas y literales (necesario para que el JIT de Tailwind las detecte:
// no se pueden construir dinamicamente con template strings tipo `bg-brand-${color}`).
export const LINE_COLOR_CLASSES: Record<ProductLineColor, {
  bar: string;
  text: string;
  chipBg: string;
  chipText: string;
  chipHoverBg: string;
  border: string;
  borderHover: string;
  softBg: string;
  solidBg: string;
  ring: string;
}> = {
  violet: {
    bar: 'bg-brand-violet',
    text: 'text-brand-violet',
    chipBg: 'bg-brand-violet/10',
    chipText: 'text-brand-violet',
    chipHoverBg: 'group-hover:bg-brand-violet',
    border: 'border-brand-violet/30',
    borderHover: 'group-hover:border-brand-violet/50',
    softBg: 'bg-brand-violet/8',
    solidBg: 'bg-brand-violet',
    ring: 'ring-brand-violet/20',
  },
  pop: {
    bar: 'bg-brand-pop',
    text: 'text-brand-pop',
    chipBg: 'bg-brand-pop/10',
    chipText: 'text-brand-pop',
    chipHoverBg: 'group-hover:bg-brand-pop',
    border: 'border-brand-pop/30',
    borderHover: 'group-hover:border-brand-pop/50',
    softBg: 'bg-brand-pop/8',
    solidBg: 'bg-brand-pop',
    ring: 'ring-brand-pop/20',
  },
  gold: {
    bar: 'bg-brand-gold',
    text: 'text-brand-gold',
    chipBg: 'bg-brand-gold/10',
    chipText: 'text-brand-gold',
    chipHoverBg: 'group-hover:bg-brand-gold',
    border: 'border-brand-gold/30',
    borderHover: 'group-hover:border-brand-gold/50',
    softBg: 'bg-brand-gold/8',
    solidBg: 'bg-brand-gold',
    ring: 'ring-brand-gold/20',
  },
  green: {
    bar: 'bg-brand-green',
    text: 'text-brand-green',
    chipBg: 'bg-brand-green/10',
    chipText: 'text-brand-green',
    chipHoverBg: 'group-hover:bg-brand-green',
    border: 'border-brand-green/30',
    borderHover: 'group-hover:border-brand-green/50',
    softBg: 'bg-brand-green/8',
    solidBg: 'bg-brand-green',
    ring: 'ring-brand-green/20',
  },
};
