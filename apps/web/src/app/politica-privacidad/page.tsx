import type { Metadata } from 'next';
import { LegalContent } from '../(legal)/legal-content';

export const metadata: Metadata = { title: 'Politica de privacidad', description: 'Tratamiento de datos personales para clientes de CollectorFigu.' };

export default function PrivacidadPage() {
  return <LegalContent eyebrow="Privacidad" title="Politica de tratamiento de datos personales" intro="Documento base para Colombia. Debe ser revisado y completado por el responsable legal del negocio." sections={[
    { title: 'Datos tratados', body: ['Podemos recolectar nombre, documento, correo, telefono, direccion, datos de pedido y datos de pago no sensibles.', 'No almacenamos datos completos de tarjetas; los pagos Wompi se procesan por la pasarela autorizada.'] },
    { title: 'Finalidades', body: ['Usamos los datos para gestionar compras, entregas, garantias, soporte, facturacion y comunicaciones transaccionales.', 'Tambien podemos usarlos para seguridad, prevencion de fraude y cumplimiento de obligaciones legales.'] },
    { title: 'Derechos', body: ['El titular puede solicitar consulta, correccion, actualizacion o eliminacion de sus datos por los canales oficiales.', 'Completar aqui el correo y direccion del responsable de datos personales.'] },
  ]} />;
}
