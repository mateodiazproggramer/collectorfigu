import type { Metadata } from 'next';
import { LegalContent } from '../(legal)/legal-content';

export const metadata: Metadata = { title: 'Garantia', description: 'Politica de garantia para figuras coleccionables armables y accesorios de CollectorFigu.' };

export default function GarantiaPage() {
  return <LegalContent eyebrow="Garantia" title="Garantia clara para tus figuras coleccionables" intro="Compra con cobertura informada por producto, soporte por WhatsApp e Instagram y trazabilidad por comprobante de pedido." sections={[
    { title: 'Defectos de fabricacion', body: ['Las figuras y sets cuentan con garantia por defectos de fabricacion (piezas faltantes, piezas rotas o color incorrecto) reportados dentro de los dias indicados al confirmar el pedido.', 'La garantia no cubre desgaste normal de uso, perdida de piezas por parte del comprador, exposicion a calor o humedad, ni armado indebido que dañe los bloques.'] },
    { title: 'Piezas y bloques sueltos', body: ['Si tu figura o set llega con piezas faltantes o dañadas, contactanos con fotos y el numero de pedido para gestionar el reemplazo de la pieza o el cambio del producto.', 'La cobertura exacta se confirma antes del despacho y queda indicada en el comprobante de compra.'] },
    { title: 'Ediciones limitadas y por encargo', body: ['Las ediciones limitadas y los productos sujetos a disponibilidad de proveedor se entregan segun existencias confirmadas al momento del pago.', 'El cliente debe conservar el comprobante de compra y el numero de pedido para cualquier reclamo de garantia.'] },
  ]} />;
}
