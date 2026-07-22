import type { Metadata } from 'next';
import { LegalContent } from '../(legal)/legal-content';

export const metadata: Metadata = { title: 'Envios', description: 'Informacion de envios, contraentrega y cobertura para Colombia.' };

export default function EnviosPage() {
  return <LegalContent eyebrow="Envios" title="Envios, entregas y contraentrega" intro="La cobertura y tiempos pueden variar segun ciudad, transportadora y disponibilidad del inventario." sections={[
    { title: 'Cobertura', body: ['Realizamos envios a ciudades de Colombia segun disponibilidad logistica. En Bogota tambien se puede coordinar entrega o recogida por canal oficial.', 'Antes del despacho se valida pago, datos del cliente, direccion y disponibilidad real del producto.'] },
    { title: 'Costo estimado', body: ['En compras superiores a $500.000 el envio aparece estimado como incluido segun cobertura. En compras menores, el sitio calcula una referencia desde $12.000.', 'El valor final puede variar por ciudad, transportadora, contraentrega o condiciones especiales de entrega.'] },
    { title: 'Contraentrega', body: ['El pago contraentrega esta sujeto a cobertura, confirmacion telefonica o por WhatsApp y validacion antifraude basica.', 'El inventario se reserva al crear el pedido y se descuenta cuando el administrador confirma el pago.'] },
    { title: 'Recepcion', body: ['El cliente debe revisar empaque, referencia y estado fisico al recibir.', 'Cualquier novedad debe reportarse por WhatsApp o correo con fotos dentro del plazo definido por el negocio.'] },
  ]} />;
}
