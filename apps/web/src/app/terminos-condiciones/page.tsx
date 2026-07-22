import type { Metadata } from 'next';
import { LegalContent } from '../(legal)/legal-content';

export const metadata: Metadata = { title: 'Terminos y condiciones', description: 'Condiciones de uso y compra de CollectorFigu.' };

export default function TerminosPage() {
  return <LegalContent eyebrow="Terminos" title="Terminos y condiciones de compra" intro="Reglas generales para compras, pagos, inventario y garantias en CollectorFigu." sections={[
    { title: 'Disponibilidad e inventario', body: ['La disponibilidad se calcula con existencias menos reservas activas.', 'Un pedido puede cancelarse si hay inconsistencia de inventario, datos incompletos o alerta de seguridad.'] },
    { title: 'Pagos', body: ['Wompi confirma pagos con validacion automatica segura. No se considera pagado un pedido solo por redireccion de la pagina.', 'En contraentrega, el administrador confirma el pago recibido antes de descontar definitivamente las existencias.'] },
    { title: 'Precios y errores', body: ['Los precios pueden cambiar sin previo aviso antes de crear el pedido.', 'Si ocurre un error evidente de precio o descripcion, el negocio podra cancelar o corregir el pedido informando al cliente.'] },
  ]} />;
}
