import { BadRequestException, Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { isIP } from 'net';
import { join, posix } from 'path';

@Injectable()
export class UploadsService {
  constructor() {
    cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
  }

  async uploadBuffer(file: Express.Multer.File, folder = process.env.CLOUDINARY_FOLDER ?? 'collectorfigu') {
    this.validateImage(file);
    if (!this.hasCloudinaryConfig()) {
      return this.uploadLocal(file, folder);
    }

    try {
      return await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder, resource_type: 'image' }, (error, result) => error ? reject(error) : resolve(result));
        stream.end(file.buffer);
      });
    } catch {
      return this.uploadLocal(file, folder);
    }
  }

  async uploadRemoteImage(url: string, folder = process.env.CLOUDINARY_FOLDER ?? 'collectorfigu') {
    const parsed = this.validateRemoteImageUrl(url);
    if (this.hasCloudinaryConfig()) {
      return cloudinary.uploader.upload(parsed.toString(), { folder, resource_type: 'image' });
    }

    let response: Response;
    try {
      response = await fetch(parsed, { redirect: 'follow' });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'error de red';
      throw new BadRequestException(`No pudimos descargar la imagen (${reason}): ${url}`);
    }
    if (!response.ok) throw new BadRequestException(`No pudimos descargar la imagen (HTTP ${response.status}): ${url}`);
    const buffer = Buffer.from(await response.arrayBuffer());

    // El Content-Type que reporta el servidor remoto no siempre es confiable (algunos CDN devuelven
    // application/octet-stream o tipos genericos), asi que el formato real se detecta leyendo los
    // primeros bytes del archivo (firma binaria) en vez de confiar ciegamente en el header.
    const sniffed = this.sniffImageMimeType(buffer);
    const headerType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
    const mimetype = sniffed ?? (headerType && ['image/jpeg', 'image/png', 'image/webp'].includes(headerType) ? headerType : undefined);
    if (!mimetype) throw new BadRequestException(`La URL no devolvio una imagen JPG, PNG o WebP valida: ${url}`);

    const file = {
      buffer,
      mimetype,
      size: buffer.length,
      originalname: parsed.pathname.split('/').pop() || 'imagen.jpg',
    } as Express.Multer.File;
    return this.uploadBuffer(file, folder);
  }

  private sniffImageMimeType(buffer: Buffer): string | undefined {
    if (buffer.length < 12) return undefined;
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
    if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
    return undefined;
  }

  async delete(publicId: string) {
    if (!publicId) return;
    if (publicId.startsWith('local/')) {
      const relativePath = publicId.replace(/^local\//, '').split('/').filter(Boolean);
      if (!relativePath.length) return;
      await unlink(join(this.uploadsDir(), ...relativePath)).catch(() => undefined);
      return;
    }
    if (!this.hasCloudinaryConfig()) return;
    await cloudinary.uploader.destroy(publicId);
  }

  private hasCloudinaryConfig() {
    return [process.env.CLOUDINARY_CLOUD_NAME, process.env.CLOUDINARY_API_KEY, process.env.CLOUDINARY_API_SECRET].every((value) => this.isRealSecret(value));
  }

  private isRealSecret(value?: string) {
    if (!value) return false;
    const normalized = value.trim().toLowerCase();
    return Boolean(normalized) && !['tu_api_key', 'tu_api_secret', 'tu_cloud_name', 'your_api_key', 'your_api_secret', 'your_cloud_name', 'change_me', 'changeme'].includes(normalized) && !normalized.startsWith('tu_') && !normalized.startsWith('your_');
  }

  private async uploadLocal(file: Express.Multer.File, folder: string) {
    const cleanFolder = folder.split('/').map((segment) => segment.replace(/[^a-zA-Z0-9_-]/g, '-')).filter(Boolean).join('/');
    const extension = this.extensionFor(file.mimetype);
    const filename = `${Date.now()}-${randomUUID()}.${extension}`;
    const relativePath = posix.join(cleanFolder || 'collectorfigu', filename);
    const targetDir = join(this.uploadsDir(), ...relativePath.split('/').slice(0, -1));
    await mkdir(targetDir, { recursive: true });
    await writeFile(join(this.uploadsDir(), ...relativePath.split('/')), file.buffer);
    return {
      url: `${this.publicUploadsBaseUrl()}/${relativePath}`,
      secure_url: `${this.publicUploadsBaseUrl()}/${relativePath}`,
      public_id: `local/${relativePath}`,
    };
  }

  private uploadsDir() {
    return process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads');
  }

  private publicUploadsBaseUrl() {
    const configured = process.env.PUBLIC_UPLOADS_URL?.replace(/\/+$/, '');
    if (configured) return configured;
    const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '');
    if (site) return `${site}/uploads`;
    return '/uploads';
  }

  private extensionFor(mimetype: string) {
    if (mimetype === 'image/png') return 'png';
    if (mimetype === 'image/webp') return 'webp';
    return 'jpg';
  }

  private validateImage(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Debes adjuntar una imagen');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      throw new BadRequestException('Formato no permitido. Usa JPG, PNG o WebP');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('La imagen no puede superar 5MB');
    }
    if (!this.hasValidImageSignature(file)) {
      throw new BadRequestException('El archivo no parece ser una imagen valida');
    }
  }

  private validateRemoteImageUrl(value: string) {
    let parsed: URL;
    try {
      parsed = new URL(value.trim());
    } catch {
      throw new BadRequestException(`URL de imagen invalida: ${value}`);
    }
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new BadRequestException('La imagen debe venir de una URL http o https');
    if (this.isBlockedRemoteHost(parsed.hostname)) {
      throw new BadRequestException('No se permiten imagenes desde redes privadas');
    }
    // Muchos CDN e imgproxy (Treinta, S3, Cloudinary, etc.) sanitizan el nombre original del
    // archivo y reemplazan puntos por guiones (ej. "foto (3).png" termina en "...-3--png", sin
    // el punto). Por eso aqui solo rechazamos extensiones que claramente NO son imagenes; una
    // extension ausente, ambigua o "pegada" sin punto se deja pasar y la valida el contenido real
    // descargado (firma binaria) en uploadRemoteImage/uploadBuffer, que es la fuente de verdad.
    const extension = parsed.pathname.toLowerCase().split('.').pop();
    const knownNonImageExtensions = [
      'pdf', 'html', 'htm', 'mp4', 'mov', 'avi', 'zip', 'rar', '7z',
      'doc', 'docx', 'xls', 'xlsx', 'txt', 'json', 'xml', 'csv',
      'gif', 'svg', 'bmp', 'tiff', 'avif', 'heic',
    ];
    if (extension && extension.length <= 5 && knownNonImageExtensions.includes(extension)) {
      throw new BadRequestException(`La URL no apunta a una imagen JPG, PNG o WebP soportada: ${value}`);
    }
    return parsed;
  }

  private isBlockedRemoteHost(hostname: string) {
    const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (host === 'localhost' || host.endsWith('.localhost')) return true;
    if (host === '0.0.0.0') return true;

    if (isIP(host) === 4) {
      const [a, b] = host.split('.').map(Number);
      return a === 10
        || a === 127
        || (a === 169 && b === 254)
        || (a === 172 && b >= 16 && b <= 31)
        || (a === 192 && b === 168);
    }

    if (isIP(host) === 6) {
      return host === '::1'
        || host.startsWith('fc')
        || host.startsWith('fd')
        || host.startsWith('fe80:');
    }

    return false;
  }

  private hasValidImageSignature(file: Express.Multer.File) {
    const buffer = file.buffer;
    if (!buffer || buffer.length < 12) return false;
    if (file.mimetype === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (file.mimetype === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (file.mimetype === 'image/webp') return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    return false;
  }
}
