import type { Metadata } from 'next';
import { LegalContent } from '../(legal)/legal-content';

export const metadata: Metadata = { title: 'Envios', description: 'Informacion de envios, contraentrega y cobertura para Colombia.' };

export default function EnviosPage() {
  return <LegalContent eyebrow="Envios" title="Envios, entregas y contraentrega" intro="La cobertura y tiempos pueden variar segun ciudad, transportadora y disponibilidad del inventario." sections={[
    { title: 'Cobertura', body: ['Realizamos envios directos a cualquier ciudad de Colombia. Por ahora no procesamos pagos para envios fuera del pais: escribenos por WhatsApp y coordinamos el envio internacional con un asesor.', 'Antes del despacho se valida pago, datos del cliente, direccion y disponibilidad real del producto.'] },
    { title: 'Costo de envio', body: ['Envio a Bogota: $9.000. Envio al resto de Colombia: $18.500.', 'En compras superiores a $500.000 el envio es gratis.', 'El costo se calcula automaticamente segun la ciudad que ingreses en el checkout.'] },
    { title: 'Contraentrega', body: ['El pago contraentrega esta sujeto a cobertura, confirmacion telefonica o por WhatsApp y validacion antifraude basica.', 'El inventario se reserva al crear el pedido y se descuenta cuando el administrador confirma el pago.'] },
    { title: 'Recepcion', body: ['El cliente debe revisar empaque, referencia y estado fisico al recibir.', 'Cualquier novedad debe reportarse por WhatsApp o correo con fotos dentro del plazo definido por el negocio.'] },
  ]} />;
}
