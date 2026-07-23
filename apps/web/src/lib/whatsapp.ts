import { COMPANY_CONTACT } from '@/lib/company';

export function whatsappNumber() {
  return (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || COMPANY_CONTACT.whatsappNumber).replace(/\D/g, '');
}

export function buildWhatsAppUrl(message: string) {
  const number = whatsappNumber();
  const text = encodeURIComponent(message);
  return number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function salesWhatsAppUrl(context?: string) {
  const message = [
    'Hola CollectorFigu, quiero hablar con un asesor.',
    context ? `Estoy revisando: ${context}` : 'Quiero saber que figuras armables tienen disponibles y precios.',
    'Me pueden ayudar?',
  ].join('\n');

  return buildWhatsAppUrl(message);
}

export function internationalOrderWhatsAppUrl(country?: string, context?: string) {
  const message = [
    'Hola CollectorFigu, quiero hacer un pedido con envio fuera de Colombia.',
    country ? `Pais/ciudad de entrega: ${country}` : 'Pais/ciudad de entrega:',
    context ? `Estoy revisando: ${context}` : 'Que productos tienen disponibles?',
    'Me ayudan a cotizar el envio internacional?',
  ].join('\n');

  return buildWhatsAppUrl(message);
}

export function specialOrderWhatsAppUrl(context?: string) {
  const message = [
    'Hola CollectorFigu, quiero hacer un pedido especial.',
    context ? `Detalle: ${context}` : 'Busco un personaje o set que no encuentro en el catalogo.',
    'Franquicia o personaje:',
    'Cantidad:',
    'Es para regalo, evento o pedido al por mayor?',
  ].join('\n');

  return buildWhatsAppUrl(message);
}
