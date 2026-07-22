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
