import { Injectable, Logger } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

const fs = require('fs');
const nodemailer = require('nodemailer');
const path = require('path');

type OrderNotification = {
  orderNumber: string;
  customerName: string;
  email: string;
  phone?: string | null;
  status: OrderStatus;
  paymentMethod: string;
  subtotal: number | string;
  shippingTotal: number | string;
  grandTotal: number | string;
  address?: {
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    department: string;
  } | null;
  items: Array<{
    nameSnapshot: string;
    variantSnapshot?: string | null;
    quantity: number;
    unitPrice: number | string;
    totalPrice: number | string;
    imageUrl?: string | null;
  }>;
  checkoutUrl?: string;
};

type OrderInlineAssets = {
  attachments: Array<{
    filename: string;
    content?: Buffer;
    contentType?: string;
    path?: string;
    cid: string;
  }>;
  logoSrc: string;
  symbolSrc: string;
  productImages: string[];
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  async sendOrderConfirmation(payload: OrderNotification) {
    const transport = this.getTransportConfig();
    if (!transport) {
      this.logger.warn(`SMTP no configurado. Confirmacion ${payload.orderNumber} pendiente de correo a ${payload.email}.`);
      return { skipped: true };
    }

    const transporter = nodemailer.createTransport(transport.config);
    const assets = this.buildOrderInlineAssets(payload);
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM ?? transport.user,
      to: payload.email,
      subject: `Resumen de tu pedido ${payload.orderNumber}`,
      text: this.buildOrderText(payload, 'Tu pedido fue creado correctamente.'),
      html: this.buildOrderHtml(payload, 'Tu pedido fue creado correctamente.', assets),
      attachments: assets.attachments,
    });

    this.logger.log(`Confirmacion de pedido ${payload.orderNumber} enviada a ${payload.email}. MessageId: ${info.messageId}`);
    return { skipped: false };
  }

  async sendOrderStatusUpdate(payload: OrderNotification, previousStatus: OrderStatus) {
    const transport = this.getTransportConfig();
    if (!transport) {
      this.logger.warn(`SMTP no configurado. Cambio ${payload.orderNumber} ${previousStatus}->${payload.status} pendiente de correo a ${payload.email}.`);
      return { skipped: true };
    }

    const transporter = nodemailer.createTransport(transport.config);
    const assets = this.buildOrderInlineAssets(payload);
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM ?? transport.user,
      to: payload.email,
      subject: `Actualizacion de tu pedido ${payload.orderNumber}: ${this.statusLabel(payload.status)}`,
      text: this.buildOrderText(payload, `Tu pedido cambio de ${this.statusLabel(previousStatus)} a ${this.statusLabel(payload.status)}.`),
      html: this.buildOrderHtml(payload, `Tu pedido cambio de ${this.statusLabel(previousStatus)} a ${this.statusLabel(payload.status)}.`, assets),
      attachments: assets.attachments,
    });

    this.logger.log(`Actualizacion de pedido ${payload.orderNumber} enviada a ${payload.email}. MessageId: ${info.messageId}`);
    return { skipped: false };
  }

  private getTransportConfig() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass || host === 'smtp.example.com') return null;
    return {
      user,
      config: {
        host,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user, pass },
      },
    };
  }

  private buildOrderText(payload: OrderNotification, intro: string) {
    return [
      intro,
      '',
      `Pedido: ${payload.orderNumber}`,
      `Estado: ${this.statusLabel(payload.status)}`,
      `Cliente: ${payload.customerName}`,
      `Correo: ${payload.email}`,
      `Telefono: ${payload.phone ?? 'No informado'}`,
      `Metodo de pago: ${this.paymentLabel(payload.paymentMethod)}`,
      payload.checkoutUrl ? `Link de pago: ${payload.checkoutUrl}` : '',
      '',
      'Productos:',
      ...payload.items.map((item) => `- ${item.quantity} x ${item.nameSnapshot}${item.variantSnapshot ? ` (${item.variantSnapshot})` : ''} - ${this.money(item.totalPrice)}`),
      '',
      `Subtotal: ${this.money(payload.subtotal)}`,
      `Envio: ${this.money(payload.shippingTotal)}`,
      `Total: ${this.money(payload.grandTotal)}`,
      '',
      payload.address ? `Entrega: ${payload.address.addressLine1}${payload.address.addressLine2 ? `, ${payload.address.addressLine2}` : ''}, ${payload.address.city}, ${payload.address.department}` : '',
      '',
      'Te avisaremos por correo cada cambio de estado del pedido.',
    ].filter(Boolean).join('\n');
  }

  private buildOrderHtml(payload: OrderNotification, intro: string, assets: OrderInlineAssets) {
    const primaryProductImage = assets.productImages.find(Boolean) ?? assets.symbolSrc;
    const rows = payload.items.map((item, index) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #e5e7eb">
          <table role="presentation" style="border-collapse:collapse;width:100%">
            <tr>
              <td style="width:58px;vertical-align:top">
                <img src="${assets.productImages[index] ?? assets.symbolSrc}" alt="${this.escape(item.nameSnapshot)}" width="48" height="48" style="display:block;width:48px;height:48px;border-radius:14px;object-fit:cover;background:#f1f5f9;border:1px solid #e5e7eb">
              </td>
              <td style="vertical-align:top">
                <div style="font-weight:800;color:#0f172a;font-size:14px">${this.escape(item.nameSnapshot)}</div>
                ${item.variantSnapshot ? `<div style="color:#2563eb;font-size:12px;font-weight:800;margin-top:3px">Color: ${this.escape(item.variantSnapshot)}</div>` : ''}
                <div style="color:#64748b;font-size:12px;margin-top:3px">${item.quantity} unidad${item.quantity === 1 ? '' : 'es'} x ${this.money(item.unitPrice)}</div>
              </td>
              <td style="vertical-align:top;text-align:right;font-weight:800;color:#0f172a;font-size:14px">${this.money(item.totalPrice)}</td>
            </tr>
          </table>
        </td>
      </tr>
    `).join('');
    const payButton = payload.checkoutUrl ? `<a href="${this.escape(payload.checkoutUrl)}" style="display:inline-block;background:#6C3CE9;color:#fff;text-decoration:none;padding:13px 18px;border-radius:12px;font-weight:800;font-size:14px">Pagar seguro con Wompi</a>` : '';
    const statusAccent = payload.status === OrderStatus.CANCELLED ? '#ef4444' : payload.status === OrderStatus.DELIVERED ? '#10b981' : '#6C3CE9';
    return `
      <div style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
        <table role="presentation" width="100%" style="border-collapse:collapse;background:#eef2f7;padding:0;margin:0">
          <tr>
            <td align="center" style="padding:28px 12px">
              <table role="presentation" width="100%" style="border-collapse:collapse;max-width:680px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 18px 45px rgba(15,23,42,.10)">
                <tr>
                  <td style="padding:22px 26px;background:#0B0B10">
                    <table role="presentation" width="100%" style="border-collapse:collapse">
                      <tr>
                        <td>
                          <img src="${assets.logoSrc}" alt="CollectorFigu" width="215" style="display:block;max-width:215px;width:100%;height:auto;border:0">
                        </td>
                        <td align="right" style="color:#93c5fd;font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase">Pedido ${this.escape(payload.orderNumber)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0;background:#0B0B10">
                    <table role="presentation" width="100%" style="border-collapse:collapse">
                      <tr>
                        <td style="padding:8px 26px 28px;vertical-align:middle;color:#fff">
                          <div style="display:inline-block;background:rgba(20,184,166,.16);color:#5eead4;border:1px solid rgba(94,234,212,.25);padding:7px 11px;border-radius:999px;font-size:12px;font-weight:800">Compra protegida</div>
                          <h1 style="margin:18px 0 8px;font-size:28px;line-height:1.15;color:#fff">Tu pedido esta en marcha</h1>
                          <p style="margin:0;color:#cbd5e1;font-size:15px;line-height:1.6">${this.escape(intro)}</p>
                        </td>
                        <td align="right" style="padding:8px 26px 28px;width:170px">
                          <img src="${primaryProductImage}" alt="Producto comprado" width="150" height="150" style="display:block;width:150px;height:150px;object-fit:cover;border-radius:26px;background:#102033;border:1px solid rgba(255,255,255,.15)">
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 26px">
                    <table role="presentation" width="100%" style="border-collapse:collapse">
                      <tr>
                        <td style="padding:14px;border:1px solid #dbeafe;background:#eff6ff;border-radius:16px">
                          <div style="font-size:12px;color:#64748b;font-weight:800;text-transform:uppercase">Estado actual</div>
                          <div style="margin-top:5px;color:${statusAccent};font-weight:900;font-size:18px">${this.statusLabel(payload.status)}</div>
                        </td>
                        <td style="width:12px"></td>
                        <td style="padding:14px;border:1px solid #dcfce7;background:#f0fdf4;border-radius:16px">
                          <div style="font-size:12px;color:#64748b;font-weight:800;text-transform:uppercase">Envio</div>
                          <div style="margin-top:5px;color:#15803d;font-weight:900;font-size:18px">${payload.shippingTotal && Number(payload.shippingTotal) > 0 ? this.money(payload.shippingTotal) : 'Incluido'}</div>
                        </td>
                        <td style="width:12px"></td>
                        <td style="padding:14px;border:1px solid #e5e7eb;background:#f8fafc;border-radius:16px">
                          <div style="font-size:12px;color:#64748b;font-weight:800;text-transform:uppercase">Total</div>
                          <div style="margin-top:5px;color:#0f172a;font-weight:900;font-size:18px">${this.money(payload.grandTotal)}</div>
                        </td>
                      </tr>
                    </table>

                    <div style="margin-top:22px;padding:18px;border:1px solid #e5e7eb;border-radius:18px;background:#fff">
                      <table role="presentation" width="100%" style="border-collapse:collapse">
                        ${rows}
                      </table>
                    </div>

                    <table role="presentation" width="100%" style="border-collapse:collapse;margin-top:22px">
                      <tr>
                        <td style="vertical-align:top;padding:18px;border:1px solid #e5e7eb;border-radius:18px;background:#f8fafc">
                          <div style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;border-radius:10px;background:#dbeafe;color:#6C3CE9;font-size:12px;font-weight:900">ENV</div>
                          <h3 style="margin:10px 0 6px;font-size:15px;color:#0f172a">Datos de entrega</h3>
                          <p style="margin:0;color:#475569;font-size:13px;line-height:1.6">
                            ${payload.address ? `${this.escape(payload.address.addressLine1)}${payload.address.addressLine2 ? `, ${this.escape(payload.address.addressLine2)}` : ''}<br>${this.escape(payload.address.city)}, ${this.escape(payload.address.department)}` : 'Pendiente por confirmar'}
                          </p>
                        </td>
                        <td style="width:14px"></td>
                        <td style="vertical-align:top;padding:18px;border:1px solid #e5e7eb;border-radius:18px;background:#f8fafc">
                          <div style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;border-radius:10px;background:#dcfce7;color:#15803d;font-size:12px;font-weight:900">OK</div>
                          <h3 style="margin:10px 0 6px;font-size:15px;color:#0f172a">Compra con respaldo</h3>
                          <p style="margin:0;color:#475569;font-size:13px;line-height:1.6">Validamos inventario, pago y entrega antes del despacho. Te avisaremos cada cambio de estado.</p>
                        </td>
                      </tr>
                    </table>

                    <div style="margin-top:22px;padding:18px;border-radius:18px;background:#0B0B10;color:#fff">
                      <table role="presentation" width="100%" style="border-collapse:collapse">
                        <tr>
                          <td>
                            <div style="font-size:13px;color:#94a3b8">Metodo de pago</div>
                            <div style="font-size:18px;font-weight:900;margin-top:3px">${this.paymentLabel(payload.paymentMethod)}</div>
                          </td>
                          <td align="right">${payButton}</td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 26px;background:#f8fafc;border-top:1px solid #e5e7eb">
                    <table role="presentation" width="100%" style="border-collapse:collapse">
                      <tr>
                        <td style="color:#64748b;font-size:12px;line-height:1.6">
                          <strong style="color:#0f172a">CollectorFigu</strong><br>
                          Figuras coleccionables armables para cada fandom. Conserva este correo para seguimiento de tu pedido.
                        </td>
                        <td align="right">
                          <img src="${assets.symbolSrc}" alt="" width="42" height="42" style="display:block;width:42px;height:42px;border-radius:12px">
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  private buildOrderInlineAssets(payload: OrderNotification): OrderInlineAssets {
    const logoCid = `collectorfigu-logo-${payload.orderNumber}@mail`;
    const symbolCid = `collectorfigu-symbol-${payload.orderNumber}@mail`;
    const logo = this.brandAsset('collectorfigu-wordmark.png');
    const symbol = this.brandAsset('collectorfigu-symbol.png');
    const attachments: OrderInlineAssets['attachments'] = [
      logo
        ? { filename: 'collectorfigu-wordmark.png', content: logo, contentType: 'image/png', cid: logoCid }
        : { filename: 'collectorfigu-logo.svg', content: Buffer.from(this.brandLogoSvg()), contentType: 'image/svg+xml', cid: logoCid },
      symbol
        ? { filename: 'collectorfigu-symbol.png', content: symbol, contentType: 'image/png', cid: symbolCid }
        : { filename: 'collectorfigu-symbol.svg', content: Buffer.from(this.brandSymbolSvg()), contentType: 'image/svg+xml', cid: symbolCid },
    ];

    const productImages = payload.items.map((item, index) => {
      if (!this.isRemoteImageUrl(item.imageUrl)) return `cid:${symbolCid}`;
      const cid = `producto-${index + 1}-${payload.orderNumber}@mail`;
      attachments.push({
        filename: `producto-${index + 1}.jpg`,
        path: item.imageUrl!,
        cid,
      });
      return `cid:${cid}`;
    });

    return {
      attachments,
      logoSrc: `cid:${logoCid}`,
      symbolSrc: `cid:${symbolCid}`,
      productImages,
    };
  }

  private brandAsset(filename: string): Buffer | null {
    const candidates = [
      path.resolve(__dirname, '../../assets/brand', filename),
      path.resolve(process.cwd(), 'src/assets/brand', filename),
      path.resolve(process.cwd(), 'dist/src/assets/brand', filename),
    ];
    const assetPath = candidates.find((candidate) => fs.existsSync(candidate));
    return assetPath ? fs.readFileSync(assetPath) : null;
  }

  private brandLogoSvg() {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="430" height="96" viewBox="0 0 430 96">
        <rect width="430" height="96" rx="18" fill="#0B0B10"/>
        <rect x="24" y="26" width="44" height="44" rx="10" fill="#FFC933"/>
        <text x="88" y="42" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="900">COLLECTOR</text>
        <text x="88" y="66" fill="#B79CFF" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="800" letter-spacing="2">FIGU</text>
      </svg>
    `.trim();
  }

  private brandSymbolSvg() {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
        <rect width="96" height="96" rx="24" fill="#0B0B10"/>
        <rect x="26" y="26" width="44" height="44" rx="10" fill="#FFC933"/>
        <circle cx="48" cy="48" r="40" fill="none" stroke="#6C3CE9" stroke-opacity=".45" stroke-width="3"/>
      </svg>
    `.trim();
  }

  private statusLabel(status: OrderStatus) {
    const labels: Record<OrderStatus, string> = {
      PENDING: 'Pendiente',
      PAID: 'Pagado',
      PREPARING: 'En preparacion',
      SHIPPED: 'Enviado',
      DELIVERED: 'Entregado',
      CANCELLED: 'Cancelado',
    };
    return labels[status] ?? status;
  }

  private paymentLabel(method: string) {
    if (method === 'WOMPI') return 'Wompi';
    if (method === 'CASH_ON_DELIVERY') return 'Pago contraentrega';
    if (method === 'BANK_TRANSFER') return 'Transferencia bancaria';
    return method;
  }

  private money(value: number | string) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value));
  }

  private escape(value: string) {
    return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
  }

  private absoluteAssetUrl(pathOrUrl: string) {
    if (/^https?:\/\//i.test(pathOrUrl)) return this.escape(pathOrUrl);
    const base = (process.env.PUBLIC_SITE_URL ?? process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    return this.escape(`${base}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`);
  }

  private isRemoteImageUrl(value?: string | null) {
    return Boolean(value && /^https?:\/\//i.test(value));
  }
}
