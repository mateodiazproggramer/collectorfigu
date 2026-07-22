import type { Metadata } from 'next';
import { LegalContent } from '../(legal)/legal-content';

export const metadata: Metadata = { title: 'Cambios y devoluciones', description: 'Politica base de cambios y devoluciones para figuras coleccionables armables y accesorios de CollectorFigu.' };

export default function CambiosPage() {
  return <LegalContent eyebrow="Cambios" title="Cambios, devoluciones y novedades" intro="Politica para figuras individuales, sets, llaveros armables y decoracion, con revision de estado y soporte por canales oficiales." sections={[
    { title: 'Cambios', body: ['Los cambios dependen del estado del producto, empaque, piezas completas, factura o comprobante de pedido.', 'En sets y ediciones especiales se revisa que las piezas y el empaque original esten completos.'] },
    { title: 'Devoluciones', body: ['Las devoluciones deben solicitarse por canales oficiales (WhatsApp o correo) con numero de pedido, fotos y descripcion de la novedad. El equipo indicara el proceso y tiempos aplicables segun el caso.', 'No se aceptan devoluciones por armado indebido, perdida de piezas por parte del comprador, ni productos usados o alterados fuera de su empaque.'] },
    { title: 'Novedades de envio', body: ['Reporta novedades de transporte (caja golpeada, piezas faltantes o producto incorrecto) con fotos, video y numero de pedido.', 'El equipo de soporte indicara los pasos de revision o reposicion segun el caso.'] },
  ]} />;
}
