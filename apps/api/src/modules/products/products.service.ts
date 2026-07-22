import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Prisma, ProductStatus } from '@prisma/client';
import { execFileSync } from 'child_process';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateProductDto, ProductVariantDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';

const slugify = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
const MAX_FEATURED_PRODUCTS = 16;

const searchFields = (value: string): Prisma.ProductWhereInput[] => [
  { name: { contains: value, mode: 'insensitive' } },
  { character: { contains: value, mode: 'insensitive' } },
  { sku: { contains: value, mode: 'insensitive' } },
  { description: { contains: value, mode: 'insensitive' } },
  { brand: { name: { contains: value, mode: 'insensitive' } } },
  { category: { name: { contains: value, mode: 'insensitive' } } },
];

const inventoryImportHeaders = [
  'sku',
  'nombre',
  'marca',
  'personaje',
  'categoria',
  'estado',
  'precio',
  'precio_anterior',
  'piezas',
  'edicion_limitada',
  'descripcion',
  'presentacion',
  'material',
  'compatibilidad',
  'color_nombre',
  'color_hex',
  'stock',
  'imagen_url',
  'imagen_general_url',
];

const inventoryImportSample = [
  'DBZ-GOKU-FIG-001',
  'Figura armable Goku Super Saiyan',
  'Dragon Ball',
  'Goku',
  'Minifiguras únicas',
  'ACTIVE',
  '16000',
  '18000',
  '120',
  'FALSO',
  'Figura armable estilo bloques, compatible con otras marcas de bloques, ideal para coleccionar.',
  'Figura individual 8cm',
  'Bloques plasticos ABS',
  'Compatible con bloques tipo LEGO',
  'Multicolor',
  '#111827',
  '10',
  'https://res.cloudinary.com/demo/image/upload/sample.jpg',
  '',
];

const productInclude = {
  brand: true,
  category: true,
  variants: {
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' as const }, { colorName: 'asc' as const }],
    include: { images: { orderBy: [{ isMain: 'desc' as const }, { sortOrder: 'asc' as const }] } },
  },
  images: { orderBy: [{ isMain: 'desc' as const }, { sortOrder: 'asc' as const }] },
  inventory: true,
};

type ImportRow = {
  line: number;
  data: Record<string, string>;
  errors: string[];
  warnings: string[];
};

type NormalizedImportRow = {
  line: number;
  sku: string;
  name: string;
  brandName: string;
  character?: string;
  categoryName: string;
  status: ProductStatus;
  description: string;
  price: number;
  previousPrice?: number;
  pieces?: number;
  isLimitedEdition: boolean;
  colorName?: string;
  colorHex?: string;
  variantSku?: string;
  stock: number;
  imageUrls: string[];
  generalImageUrls: string[];
  specs: Record<string, string>;
};

export type ImportProgressEvent =
  | { type: 'progress'; phase: 'parsing' | 'validating'; message: string }
  | { type: 'progress'; phase: 'uploading'; processedRows: number; totalRows: number; processedImages: number; totalImages: number; currentLabel: string; message: string }
  | { type: 'warning'; line: number; message: string };

export type ImportProgressCallback = (event: ImportProgressEvent) => void;

type FailedImage = { line: number; sku: string; productName: string; url: string; reason: string };

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService, private uploads: UploadsService) {}

  async findAll(q: QueryProductsDto) {
    const where = this.buildWhere(q, true);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, include: productInclude, skip: (q.page - 1) * q.limit, take: q.limit, orderBy: this.buildOrderBy(q.sort) }),
      this.prisma.product.count({ where }),
    ]);
    return { items, meta: { total, page: q.page, limit: q.limit, pages: Math.ceil(total / q.limit) } };
  }

  async findOne(slug: string) {
    const product = await this.prisma.product.findUnique({ where: { slug }, include: productInclude });
    if (!product || product.status !== ProductStatus.ACTIVE) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async adminFindAll(q: QueryProductsDto) {
    const where = this.buildWhere(q, false);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, include: productInclude, skip: (q.page - 1) * q.limit, take: q.limit, orderBy: this.buildOrderBy(q.sort) }),
      this.prisma.product.count({ where }),
    ]);
    return { items, meta: { total, page: q.page, limit: q.limit, pages: Math.ceil(total / q.limit) } };
  }

  async adminOptions() {
    const [brands, categories] = await Promise.all([
      this.prisma.brand.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.category.findMany({ orderBy: { name: 'asc' } }),
    ]);
    return { brands, categories };
  }

  async catalogOptions() {
    const [brands, categories] = await Promise.all([
      this.prisma.brand.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, slug: true } }),
      this.prisma.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, slug: true } }),
    ]);
    return { brands, categories };
  }

  async createBrand(name: string) {
    return this.prisma.brand.create({ data: { name: name.trim(), slug: slugify(name) } });
  }

  async updateBrand(id: string, name: string) {
    await this.ensureBrand(id);
    return this.prisma.brand.update({ where: { id }, data: { name: name.trim(), slug: slugify(name) } });
  }

  async deleteBrand(id: string) {
    await this.ensureBrand(id);
    const products = await this.prisma.product.count({ where: { brandId: id } });
    if (products > 0) throw new BadRequestException('No se puede eliminar una marca con productos asociados');
    await this.prisma.brand.delete({ where: { id } });
    return { ok: true };
  }

  async createCategory(name: string) {
    return this.prisma.category.create({ data: { name: name.trim(), slug: slugify(name) } });
  }

  async updateCategory(id: string, name: string) {
    await this.ensureCategory(id);
    return this.prisma.category.update({ where: { id }, data: { name: name.trim(), slug: slugify(name) } });
  }

  async deleteCategory(id: string) {
    await this.ensureCategory(id);
    const products = await this.prisma.product.count({ where: { categoryId: id } });
    if (products > 0) throw new BadRequestException('No se puede eliminar una categoria con productos asociados');
    await this.prisma.category.delete({ where: { id } });
    return { ok: true };
  }

  async create(dto: CreateProductDto) {
    if (dto.isFeatured) await this.assertFeaturedLimit();
    const { stock, brandId, categoryId, specifications, variants, ...product } = dto;
    const variantData = variants?.length
      ? variants.map((variant, index) => this.variantCreateData(variant, index))
      : product.color
        ? [this.variantCreateData({ colorName: product.color, colorHex: '#111827', stock: stock ?? 0 }, 0)]
        : [];
    return this.prisma.product.create({
      data: {
        ...product,
        slug: slugify(dto.name),
        specifications: specifications as Prisma.InputJsonValue,
        brand: { connect: { id: brandId } },
        category: { connect: { id: categoryId } },
        inventory: { create: { stock: stock ?? 0 } },
        ...(variantData.length ? { variants: { create: variantData } } : {}),
      },
      include: productInclude,
    });
  }

  async update(id: string, dto: Partial<CreateProductDto>) {
    const current = await this.ensure(id);
    if (dto.isFeatured === true && !current.isFeatured) await this.assertFeaturedLimit();
    const { stock, brandId, categoryId, specifications, variants, ...product } = dto;
    const data: Prisma.ProductUpdateInput = {
      ...product,
      ...(dto.name ? { slug: slugify(dto.name) } : {}),
      ...(brandId ? { brand: { connect: { id: brandId } } } : {}),
      ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
      ...(specifications ? { specifications: specifications as Prisma.InputJsonValue } : {}),
    };

    await this.prisma.product.update({ where: { id }, data });
    if (stock !== undefined) {
      await this.prisma.inventory.upsert({
        where: { productId: id },
        update: { stock },
        create: { productId: id, stock },
      });
    }
    if (variants !== undefined) await this.replaceVariants(id, variants);
    return this.prisma.product.findUnique({ where: { id }, include: productInclude });
  }

  async deactivate(id: string) {
    await this.ensure(id);
    return this.prisma.product.update({ where: { id }, data: { status: ProductStatus.INACTIVE }, include: productInclude });
  }

  async addVariant(productId: string, dto: ProductVariantDto) {
    await this.ensure(productId);
    const count = await this.prisma.productVariant.count({ where: { productId } });
    const variant = await this.prisma.productVariant.create({ data: { productId, ...this.variantCreateData(dto, count) } });
    await this.syncProductInventory(productId);
    return this.prisma.productVariant.findUnique({ where: { id: variant.id }, include: { images: true } });
  }

  async updateVariant(productId: string, variantId: string, dto: Partial<ProductVariantDto>) {
    await this.ensure(productId);
    const variant = await this.prisma.productVariant.findFirst({ where: { id: variantId, productId } });
    if (!variant) throw new NotFoundException('Color no encontrado');
    const updated = await this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        ...(dto.sku !== undefined ? { sku: dto.sku?.trim() || null } : {}),
        ...(dto.colorName !== undefined ? { colorName: dto.colorName.trim() } : {}),
        ...(dto.colorHex !== undefined ? { colorHex: dto.colorHex } : {}),
        ...(dto.stock !== undefined ? { stock: dto.stock } : {}),
        ...(dto.reserved !== undefined ? { reserved: dto.reserved } : {}),
        ...(dto.lowStockThreshold !== undefined ? { lowStockThreshold: dto.lowStockThreshold } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: { images: true },
    });
    await this.syncProductInventory(productId);
    return updated;
  }

  async deleteVariant(productId: string, variantId: string) {
    await this.ensure(productId);
    const variant = await this.prisma.productVariant.findFirst({ where: { id: variantId, productId } });
    if (!variant) throw new NotFoundException('Color no encontrado');
    const orderItems = await this.prisma.orderItem.count({ where: { variantId } });
    const cartItems = await this.prisma.cartItem.count({ where: { variantId } });
    if (orderItems > 0 || cartItems > 0) {
      await this.prisma.productVariant.update({ where: { id: variantId }, data: { isActive: false } });
    } else {
      await this.prisma.productVariant.delete({ where: { id: variantId } });
    }
    await this.syncProductInventory(productId);
    return { ok: true };
  }

  async addImage(productId: string, file: Express.Multer.File, body: { alt?: string; isMain?: string; variantId?: string }) {
    const product = await this.ensure(productId);
    const variantId = body.variantId || undefined;
    if (variantId) await this.ensureVariant(productId, variantId);
    const existingImages = product.images.filter((image) => image.variantId === (variantId ?? null));
    if (existingImages.length >= 5) throw new BadRequestException('Maximo 5 imagenes por color o producto');
    const uploaded = await this.uploads.uploadBuffer(file, `${process.env.CLOUDINARY_FOLDER ?? 'collectorfigu'}/products`);
    const isMain = body.isMain === 'true' || existingImages.length === 0;

    if (isMain) await this.prisma.productImage.updateMany({ where: { productId, variantId: variantId ?? null }, data: { isMain: false } });

    return this.prisma.productImage.create({
      data: {
        productId,
        variantId,
        url: (uploaded as any).secure_url ?? (uploaded as any).url,
        publicId: (uploaded as any).public_id,
        alt: body.alt ?? product.name,
        sortOrder: existingImages.length,
        isMain,
      },
    });
  }

  async updateImage(productId: string, imageId: string, file: Express.Multer.File | undefined, body: { alt?: string; isMain?: string; sortOrder?: string; variantId?: string }) {
    await this.ensure(productId);
    const image = await this.prisma.productImage.findFirst({ where: { id: imageId, productId } });
    if (!image) throw new NotFoundException('Imagen no encontrada');
    const nextVariantId = body.variantId !== undefined ? (body.variantId || null) : image.variantId;
    if (nextVariantId) await this.ensureVariant(productId, nextVariantId);

    const data: Prisma.ProductImageUpdateInput = {
      ...(body.alt !== undefined ? { alt: body.alt } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: Number(body.sortOrder) } : {}),
      ...(body.variantId !== undefined ? { variant: nextVariantId ? { connect: { id: nextVariantId } } : { disconnect: true } } : {}),
    };

    if (file) {
      const uploaded = await this.uploads.uploadBuffer(file, `${process.env.CLOUDINARY_FOLDER ?? 'collectorfigu'}/products`);
      await this.uploads.delete(image.publicId);
      data.url = (uploaded as any).secure_url ?? (uploaded as any).url;
      data.publicId = (uploaded as any).public_id;
    }

    if (body.isMain === 'true') {
      await this.prisma.productImage.updateMany({ where: { productId, variantId: nextVariantId }, data: { isMain: false } });
      data.isMain = true;
    }

    return this.prisma.productImage.update({ where: { id: imageId }, data });
  }

  async deleteImage(productId: string, imageId: string) {
    await this.ensure(productId);
    const image = await this.prisma.productImage.findFirst({ where: { id: imageId, productId } });
    if (!image) throw new NotFoundException('Imagen no encontrada');
    await this.uploads.delete(image.publicId);
    await this.prisma.productImage.delete({ where: { id: imageId } });
    const nextMain = await this.prisma.productImage.findFirst({ where: { productId, variantId: image.variantId }, orderBy: { sortOrder: 'asc' } });
    if (nextMain) await this.prisma.productImage.update({ where: { id: nextMain.id }, data: { isMain: true } });
    return { ok: true };
  }

  async buildInventoryTemplate() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CollectorFigu';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Inventario');
    sheet.addRow(inventoryImportHeaders);
    sheet.addRow(inventoryImportSample);
    sheet.columns = inventoryImportHeaders.map((header) => ({
      key: header,
      width: Math.max(14, header.length + 4),
    }));
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: 'A1', to: `${sheet.getColumn(inventoryImportHeaders.length).letter}1` };
    sheet.getColumn('M').width = 44;
    sheet.getColumn('T').width = 56;
    sheet.getColumn('U').width = 56;

    const guide = workbook.addWorksheet('Guia');
    guide.addRows([
      ['Campo', 'Como llenarlo'],
      ['sku', 'Codigo unico del producto. Si ya existe, se actualiza.'],
      ['nombre', 'Nombre comercial visible en tienda.'],
      ['marca', 'Franquicia del producto (Dragon Ball, Marvel, Star Wars...). Se crea automaticamente si no existe.'],
      ['categoria', 'Linea de producto (Minifiguras únicas, Cuadros personalizados, Llaveros, Funkos & Sets...). Se crea automaticamente si no existe.'],
      ['personaje', 'Nombre del personaje representado por la figura.'],
      ['piezas', 'Numero de piezas o bloques que trae el producto.'],
      ['edicion_limitada', 'Usa SI/TRUE o NO/FALSE.'],
      ['estado', 'ACTIVE visible, DRAFT borrador, INACTIVE oculto.'],
      ['precio/precio_anterior', 'Numeros sin simbolo de moneda. Ejemplo: 16000.'],
      ['color_nombre/color_hex', 'Una fila por color. color_hex debe ser #RRGGBB.'],
      ['stock', 'Existencias de ese color.'],
      ['imagen_url', 'URL publica JPG, PNG o WebP para ese color. Varias con | o ;.'],
      ['imagen_general_url', 'Imagen general del producto. Varias con | o ;.'],
      ['Importante', 'Puedes dejar imagenes vacias y cargarlas luego desde el panel.'],
    ]);
    guide.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    guide.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0EA5E9' } };
    guide.columns = [{ width: 24 }, { width: 80 }];

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async importInventory(file: Express.Multer.File | undefined, body: { commit?: string }, onProgress?: ImportProgressCallback) {
    if (!file) throw new BadRequestException('Debes adjuntar un archivo CSV o Excel');
    if (file.size > 5 * 1024 * 1024) throw new BadRequestException('El archivo no puede superar 5MB');
    onProgress?.({ type: 'progress', phase: 'parsing', message: 'Leyendo el archivo...' });
    const rows = await this.parseImportFile(file);
    if (rows.length > 1000) throw new BadRequestException('Puedes importar maximo 1000 filas por archivo');

    onProgress?.({ type: 'progress', phase: 'validating', message: `Validando ${rows.length} filas...` });
    const normalized = rows.map((row) => this.normalizeImportRow(row));
    const validRows = normalized.filter((row): row is NormalizedImportRow => Boolean(row));
    const errors = rows.flatMap((row) => row.errors.map((message) => ({ line: row.line, message })));
    const warnings = rows.flatMap((row) => row.warnings.map((message) => ({ line: row.line, message })));
    const duplicatedSkus = this.findDuplicateRows(validRows.map((row) => `${row.sku}::${row.colorName ?? 'general'}`));
    for (const duplicated of duplicatedSkus) {
      warnings.push({ line: 0, message: `El archivo tiene filas repetidas para ${duplicated}; se usara la ultima durante la importacion.` });
    }

    const summary = this.buildImportSummary(validRows, errors, warnings);
    if (body.commit !== 'true') return { mode: 'preview', ...summary, rows: validRows.slice(0, 50) };
    if (errors.length) throw new BadRequestException({ message: 'Corrige los errores antes de importar', errors, warnings, summary: summary.summary });

    const { result, failedImages } = await this.commitImport(validRows, onProgress);
    for (const failure of failedImages) {
      warnings.push({ line: failure.line, message: `Imagen no subida para "${failure.productName}" (${failure.sku}): ${failure.reason}` });
    }
    summary.summary.warnings = warnings.length;
    return { mode: 'commit', ...summary, result };
  }

  async importCsv(file: Express.Multer.File | undefined, body: { commit?: string }) {
    return this.importInventory(file, body);
  }

  private async ensure(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id }, include: { images: { orderBy: { sortOrder: 'asc' } } } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  private async assertFeaturedLimit() {
    const count = await this.prisma.product.count({ where: { isFeatured: true } });
    if (count >= MAX_FEATURED_PRODUCTS) throw new BadRequestException(`Solo se permiten ${MAX_FEATURED_PRODUCTS} productos destacados en portada`);
  }

  private parseImportCsv(input: string) {
    const text = input.replace(/^\uFEFF/, '').trim();
    if (!text) throw new BadRequestException('El CSV esta vacio');
    const matrix = this.parseCsvMatrix(text, this.detectCsvDelimiter(text));
    return this.parseImportMatrix(matrix, 'CSV');
  }

  private async parseImportFile(file: Express.Multer.File) {
    if (!file.buffer?.length) throw new BadRequestException('El archivo llego vacio. Selecciona nuevamente el Excel o CSV.');
    const filename = file.originalname.toLowerCase();
    const mimetype = file.mimetype.toLowerCase();
    const isZipBasedExcel = file.buffer.subarray(0, 4).toString('hex') === '504b0304';
    const isLegacyXls = file.buffer.subarray(0, 4).toString('hex') === 'd0cf11e0' || filename.endsWith('.xls');
    if (isLegacyXls) throw new BadRequestException('Excel 97-2003 (.xls) no esta soportado. Abre el archivo en Excel o Google Sheets y guardalo como .xlsx o .csv.');
    const isExcel = isZipBasedExcel || filename.endsWith('.xlsx') || mimetype.includes('spreadsheet') || mimetype.includes('openxml');
    const isCsv = filename.endsWith('.csv') || mimetype.includes('csv') || mimetype === 'text/plain';
    if (isExcel) return this.parseImportExcel(file.buffer);
    if (isCsv) return this.parseImportCsv(file.buffer.toString('utf8'));
    throw new BadRequestException('Formato no permitido. Sube un archivo .xlsx o .csv');
  }

  private async parseImportExcel(buffer: Buffer) {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as any);
    } catch {
      return this.parseImportExcelOpenXmlFallback(buffer);
    }
    const worksheet = workbook.getWorksheet('Inventario') ?? workbook.worksheets[0];
    if (!worksheet) throw new BadRequestException('El Excel no tiene hojas');
    const matrix: string[][] = [];
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const values: string[] = [];
      const cellCount = Math.max(row.cellCount, inventoryImportHeaders.length);
      for (let index = 1; index <= cellCount; index += 1) {
        values.push(this.excelCellToString(row.getCell(index)));
      }
      matrix.push(values);
    });
    return this.parseImportMatrix(matrix, 'Excel');
  }

  private async parseImportExcelOpenXmlFallback(buffer: Buffer) {
    const directory = await mkdtemp(join(tmpdir(), 'collectorfigu-import-'));
    const filename = join(directory, 'inventario.xlsx');
    try {
      await writeFile(filename, buffer);
      execFileSync('unzip', ['-qq', filename, '-d', directory], { timeout: 10_000 });
      const sheetXml = await readFile(join(directory, 'xl', 'worksheets', 'sheet1.xml'), 'utf8');
      const sharedStrings = await this.readSharedStrings(directory);
      const matrix = this.parseOpenXmlSheet(sheetXml, sharedStrings);
      return this.parseImportMatrix(matrix, 'Excel');
    } catch {
      throw new BadRequestException('No pudimos leer el Excel. Verifica que sea un .xlsx valido generado por Excel o Google Sheets.');
    } finally {
      await rm(directory, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private async readSharedStrings(directory: string) {
    try {
      const xml = await readFile(join(directory, 'xl', 'sharedStrings.xml'), 'utf8');
      const strings: string[] = [];
      for (const match of xml.matchAll(/<[\w-]*:?si\b[^>]*>([\s\S]*?)<\/[\w-]*:?si>/g)) {
        const parts = [...match[1].matchAll(/<[\w-]*:?t\b[^>]*>([\s\S]*?)<\/[\w-]*:?t>/g)].map((entry) => this.decodeXml(entry[1]));
        strings.push(parts.join(''));
      }
      return strings;
    } catch {
      return [];
    }
  }

  private parseOpenXmlSheet(xml: string, sharedStrings: string[]) {
    const matrix: string[][] = [];
    for (const rowMatch of xml.matchAll(/<[\w-]*:?row\b[^>]*>([\s\S]*?)<\/[\w-]*:?row>/g)) {
      const row: string[] = [];
      let sequentialIndex = 0;
      for (const cellMatch of rowMatch[1].matchAll(/<[\w-]*:?c\b([^>]*)>([\s\S]*?)<\/[\w-]*:?c>/g)) {
        const attrs = cellMatch[1];
        const body = cellMatch[2];
        const ref = attrs.match(/\br="([A-Z]+)\d+"/)?.[1];
        const index = ref ? this.columnIndex(ref) : sequentialIndex;
        row[index] = this.openXmlCellValue(attrs, body, sharedStrings);
        sequentialIndex = index + 1;
      }
      matrix.push(row.map((value) => value ?? ''));
    }
    return matrix;
  }

  private openXmlCellValue(attrs: string, body: string, sharedStrings: string[]) {
    if (attrs.includes('t="inlineStr"')) {
      return this.decodeXml([...body.matchAll(/<[\w-]*:?t\b[^>]*>([\s\S]*?)<\/[\w-]*:?t>/g)].map((entry) => entry[1]).join('')).trim();
    }
    const rawValue = body.match(/<[\w-]*:?v>([\s\S]*?)<\/[\w-]*:?v>/)?.[1] ?? '';
    if (attrs.includes('t="s"')) return (sharedStrings[Number(rawValue)] ?? '').trim();
    return this.decodeXml(rawValue).trim();
  }

  private columnIndex(column: string) {
    return column.split('').reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0) - 1;
  }

  private decodeXml(value: string) {
    return value
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
  }

  private excelCellToString(cell: ExcelJS.Cell) {
    const value = cell.value as any;
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      if ('text' in value && value.text !== undefined) return String(value.text).trim();
      if ('hyperlink' in value && value.hyperlink !== undefined) return String(value.hyperlink).trim();
      if ('result' in value && value.result !== undefined) return String(value.result).trim();
      if (value instanceof Date) return value.toISOString().slice(0, 10);
    }
    return String(cell.text || value).trim();
  }

  private parseImportMatrix(matrix: string[][], format: 'CSV' | 'Excel') {
    if (matrix.length < 2) throw new BadRequestException(`El ${format} debe tener encabezados y al menos una fila`);
    const headers = matrix[0].map((header) => this.normalizeHeader(header));
    return matrix.slice(1).map((cells, index) => {
      const data: Record<string, string> = {};
      headers.forEach((header, cellIndex) => {
        if (header) data[header] = (cells[cellIndex] ?? '').trim();
      });
      return { line: index + 2, data, errors: [], warnings: [] } as ImportRow;
    }).filter((row) => Object.values(row.data).some(Boolean));
  }

  private detectCsvDelimiter(input: string) {
    const firstLine = input.split(/\r?\n/).find((line) => line.trim()) ?? '';
    const candidates = [',', ';', '\t'];
    return candidates
      .map((delimiter) => ({ delimiter, count: firstLine.split(delimiter).length }))
      .sort((a, b) => b.count - a.count)[0]?.delimiter ?? ',';
  }

  private parseCsvMatrix(input: string, delimiter = ',') {
    const rows: string[][] = [];
    let current = '';
    let row: string[] = [];
    let quoted = false;
    for (let i = 0; i < input.length; i += 1) {
      const char = input[i];
      const next = input[i + 1];
      if (char === '"' && quoted && next === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === delimiter && !quoted) {
        row.push(current);
        current = '';
      } else if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && next === '\n') i += 1;
        row.push(current);
        rows.push(row);
        row = [];
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current);
    rows.push(row);
    return rows.filter((entry) => entry.some((cell) => cell.trim() !== ''));
  }

  private normalizeHeader(value: string) {
    const key = slugify(value).replace(/-/g, '_');
    const aliases: Record<string, string> = {
      nombre: 'name',
      name: 'name',
      marca: 'brand',
      brand: 'brand',
      personaje: 'character',
      character: 'character',
      categoria: 'category',
      category: 'category',
      estado: 'status',
      status: 'status',
      precio: 'price',
      price: 'price',
      precio_anterior: 'previous_price',
      previous_price: 'previous_price',
      piezas: 'pieces',
      pieces: 'pieces',
      edicion_limitada: 'is_limited_edition',
      is_limited_edition: 'is_limited_edition',
      descripcion: 'description',
      description: 'description',
      color: 'color_name',
      color_nombre: 'color_name',
      color_name: 'color_name',
      color_hex: 'color_hex',
      stock: 'stock',
      existencias: 'stock',
      imagen_url: 'image_urls',
      image_url: 'image_urls',
      imagenes_urls: 'image_urls',
      image_urls: 'image_urls',
      imagen_general_url: 'general_image_urls',
      general_image_url: 'general_image_urls',
      presentacion: 'presentation',
      material: 'material',
      compatibilidad: 'compatibility',
      variant_sku: 'variant_sku',
      sku_color: 'variant_sku',
    };
    return aliases[key] ?? key;
  }

  private normalizeImportRow(row: ImportRow): NormalizedImportRow | null {
    const get = (key: string) => row.data[key]?.trim() ?? '';
    const required = ['sku', 'name', 'brand', 'category', 'price', 'description'];
    for (const key of required) {
      if (!get(key)) row.errors.push(`Falta ${key}`);
    }

    const status = this.parseStatus(get('status')) ?? ProductStatus.ACTIVE;
    const price = this.parseMoney(get('price'));
    if (price === undefined) row.errors.push('Precio invalido');
    const previousPrice = this.parseMoney(get('previous_price'), true);
    const stock = this.parseInteger(get('stock') || '0', 0);
    if (stock === undefined) row.errors.push('Stock invalido');
    const colorHex = get('color_hex') || '#111827';
    if (get('color_name') && !/^#[0-9a-fA-F]{6}$/.test(colorHex)) row.errors.push('color_hex debe tener formato #RRGGBB');
    const imageUrls = this.splitUrls(get('image_urls'));
    const generalImageUrls = this.splitUrls(get('general_image_urls'));
    for (const url of [...imageUrls, ...generalImageUrls]) {
      try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) row.errors.push(`URL de imagen invalida: ${url}`);
      } catch {
        row.errors.push(`URL de imagen invalida: ${url}`);
      }
    }

    if (!get('color_name') && imageUrls.length) row.warnings.push('La imagen_url se asociara como imagen general porque no hay color_nombre');
    if (row.errors.length) return null;

    return {
      line: row.line,
      sku: get('sku'),
      name: get('name'),
      brandName: get('brand'),
      character: get('character') || undefined,
      categoryName: get('category'),
      status,
      description: get('description'),
      price: price!,
      previousPrice,
      pieces: this.parseInteger(get('pieces')),
      isLimitedEdition: this.parseBoolean(get('is_limited_edition')),
      colorName: get('color_name') || undefined,
      colorHex,
      variantSku: get('variant_sku') || undefined,
      stock: stock!,
      imageUrls,
      generalImageUrls,
      specs: {
        presentacion: get('presentation') || 'No especificada',
        material: get('material') || 'No especificado',
        compatibilidad: get('compatibility') || 'Compatible con bloques tipo LEGO',
      },
    };
  }

  private parseBoolean(value: string) {
    const normalized = value.trim().toLowerCase();
    return ['true', 'si', 'sí', 'yes', 'verdadero', '1'].includes(normalized);
  }

  private parseStatus(value: string) {
    if (!value) return undefined;
    const normalized = value.trim().toUpperCase();
    if (['ACTIVE', 'DRAFT', 'INACTIVE'].includes(normalized)) return normalized as ProductStatus;
    if (normalized === 'VISIBLE') return ProductStatus.ACTIVE;
    if (normalized === 'BORRADOR') return ProductStatus.DRAFT;
    if (normalized === 'INACTIVO') return ProductStatus.INACTIVE;
    return undefined;
  }

  private parseMoney(value: string, optional = false) {
    if (!value && optional) return undefined;
    const number = Number(value.replace(/[.$\s]/g, '').replace(',', '.'));
    return Number.isFinite(number) && number >= 0 ? number : undefined;
  }

  private parseInteger(value: string, fallback?: number) {
    if (!value && fallback !== undefined) return fallback;
    if (!value) return undefined;
    const number = Number(value);
    return Number.isInteger(number) && number >= 0 ? number : undefined;
  }

  private splitUrls(value: string) {
    if (!value) return [];
    return value.split(/[|;]/).map((url) => url.trim()).filter(Boolean).slice(0, 5);
  }

  private findDuplicateRows(values: string[]) {
    const seen = new Set<string>();
    const duplicated = new Set<string>();
    for (const value of values) {
      if (seen.has(value)) duplicated.add(value);
      seen.add(value);
    }
    return [...duplicated];
  }

  private buildImportSummary(rows: NormalizedImportRow[], errors: Array<{ line: number; message: string }>, warnings: Array<{ line: number; message: string }>) {
    const productSkus = new Set(rows.map((row) => row.sku));
    const variants = rows.filter((row) => row.colorName).length;
    const imageCount = rows.reduce((sum, row) => sum + row.imageUrls.length + row.generalImageUrls.length, 0);
    return {
      summary: {
        rows: rows.length,
        products: productSkus.size,
        variants,
        imageCount,
        errors: errors.length,
        warnings: warnings.length,
      },
      errors,
      warnings,
    };
  }

  private async commitImport(rows: NormalizedImportRow[], onProgress?: ImportProgressCallback) {
    const grouped = new Map<string, NormalizedImportRow[]>();
    for (const row of rows) grouped.set(row.sku, [...(grouped.get(row.sku) ?? []), row]);
    let created = 0;
    let updated = 0;
    let variants = 0;
    let images = 0;
    const failedImages: FailedImage[] = [];

    const totalRows = grouped.size;
    const totalImages = rows.reduce((sum, row) => sum + row.imageUrls.length + row.generalImageUrls.length, 0);
    let processedRows = 0;
    let processedImages = 0;

    const reportImageProgress = (label: string) => {
      onProgress?.({
        type: 'progress',
        phase: 'uploading',
        processedRows,
        totalRows,
        processedImages,
        totalImages,
        currentLabel: label,
        message: `Subiendo imagenes (${processedImages}/${totalImages}) - producto ${processedRows}/${totalRows}: ${label}`,
      });
    };

    for (const [sku, productRows] of grouped) {
      const first = productRows[0];
      const brand = await this.prisma.brand.upsert({ where: { slug: slugify(first.brandName) }, update: { name: first.brandName }, create: { name: first.brandName, slug: slugify(first.brandName) } });
      const category = await this.prisma.category.upsert({ where: { slug: slugify(first.categoryName) }, update: { name: first.categoryName }, create: { name: first.categoryName, slug: slugify(first.categoryName) } });
      const stockTotal = productRows.reduce((sum, row) => sum + row.stock, 0);
      const existing = await this.prisma.product.findUnique({ where: { sku }, include: { images: true } });
      const slug = existing?.slug ?? await this.uniqueSlug(first.name);
      const product = await this.prisma.product.upsert({
        where: { sku },
        update: {
          name: first.name,
          slug,
          brandId: brand.id,
          character: first.character,
          categoryId: category.id,
          description: first.description,
          specifications: first.specs as Prisma.InputJsonValue,
          price: first.price,
          previousPrice: first.previousPrice,
          status: first.status,
          pieces: first.pieces,
          isLimitedEdition: first.isLimitedEdition,
        },
        create: {
          sku,
          slug,
          name: first.name,
          brandId: brand.id,
          character: first.character,
          categoryId: category.id,
          description: first.description,
          specifications: first.specs as Prisma.InputJsonValue,
          price: first.price,
          previousPrice: first.previousPrice,
          status: first.status,
          pieces: first.pieces,
          isLimitedEdition: first.isLimitedEdition,
        },
        include: { images: true },
      });
      existing ? updated += 1 : created += 1;
      await this.prisma.inventory.upsert({ where: { productId: product.id }, update: { stock: stockTotal }, create: { productId: product.id, stock: stockTotal } });

      const tryImportImage = async (variantId: string | undefined, url: string, alt: string, isMain: boolean) => {
        reportImageProgress(first.name);
        try {
          const added = await this.createImportedImage(product.id, variantId, url, alt, isMain);
          if (added) images += 1;
        } catch (error) {
          const reason = error instanceof Error ? error.message : 'error desconocido';
          failedImages.push({ line: first.line, sku, productName: first.name, url, reason });
        } finally {
          processedImages += 1;
        }
      };

      for (const url of first.generalImageUrls) {
        await tryImportImage(undefined, url, first.name, product.images.length === 0);
      }

      for (const [index, row] of productRows.entries()) {
        if (!row.colorName) {
          for (const url of row.imageUrls) {
            await tryImportImage(undefined, url, row.name, product.images.length === 0);
          }
          continue;
        }
        const currentVariant = await this.prisma.productVariant.findFirst({ where: { productId: product.id, colorName: { equals: row.colorName, mode: 'insensitive' } } });
        const variant = currentVariant
          ? await this.prisma.productVariant.update({ where: { id: currentVariant.id }, data: { sku: row.variantSku, colorName: row.colorName, colorHex: row.colorHex!, stock: row.stock, sortOrder: index, isActive: true }, include: { images: true } })
          : await this.prisma.productVariant.create({ data: { productId: product.id, sku: row.variantSku, colorName: row.colorName, colorHex: row.colorHex!, stock: row.stock, sortOrder: index }, include: { images: true } });
        variants += 1;
        for (const url of row.imageUrls) {
          await tryImportImage(variant.id, url, `${row.name} ${row.colorName}`, variant.images.length === 0);
        }
      }
      await this.syncProductInventory(product.id);
      processedRows += 1;
    }
    return { result: { created, updated, variants, images, imagesFailed: failedImages.length }, failedImages };
  }

  private async uniqueSlug(name: string) {
    const base = slugify(name);
    let slug = base;
    let index = 2;
    while (await this.prisma.product.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${base}-${index}`;
      index += 1;
    }
    return slug;
  }

  private async createImportedImage(productId: string, variantId: string | undefined, url: string, alt: string, isMain: boolean) {
    const exists = await this.prisma.productImage.findFirst({ where: { productId, variantId: variantId ?? null, url } });
    if (exists) return false;
    const uploaded = await this.uploads.uploadRemoteImage(url, `${process.env.CLOUDINARY_FOLDER ?? 'collectorfigu'}/products`);
    if (isMain) await this.prisma.productImage.updateMany({ where: { productId, variantId: variantId ?? null }, data: { isMain: false } });
    const count = await this.prisma.productImage.count({ where: { productId, variantId: variantId ?? null } });
    await this.prisma.productImage.create({
      data: {
        productId,
        variantId,
        url: (uploaded as any).secure_url ?? (uploaded as any).url,
        publicId: (uploaded as any).public_id,
        alt,
        isMain,
        sortOrder: count,
      },
    });
    return true;
  }

  private async ensureVariant(productId: string, variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({ where: { id: variantId, productId } });
    if (!variant) throw new NotFoundException('Color no encontrado');
    return variant;
  }

  private async ensureBrand(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('Marca no encontrada');
    return brand;
  }

  private async ensureCategory(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Categoria no encontrada');
    return category;
  }

  private buildWhere(q: QueryProductsDto, onlyActive: boolean): Prisma.ProductWhereInput {
    const and: Prisma.ProductWhereInput[] = [];
    const search = q.q?.trim();

    if (onlyActive) and.push({ status: ProductStatus.ACTIVE });
    if (search) {
      const terms = search.split(/\s+/).filter(Boolean);
      and.push(...terms.map((term) => ({ OR: searchFields(term) })));
    }
    if (q.brand) {
      and.push({ brand: { OR: [{ slug: slugify(q.brand) }, { name: { equals: q.brand, mode: 'insensitive' } }] } });
    }
    if (q.brands) {
      const names = q.brands.split(',').map((entry) => entry.trim()).filter(Boolean);
      if (names.length) {
        and.push({ brand: { OR: names.flatMap((name) => [{ slug: slugify(name) }, { name: { equals: name, mode: 'insensitive' as const } }]) } });
      }
    }
    if (q.category) {
      and.push({ category: { OR: [{ slug: slugify(q.category) }, { name: { equals: q.category, mode: 'insensitive' } }] } });
    }
    if (q.character) and.push({ character: { contains: q.character, mode: 'insensitive' } });
    if (q.minPrice !== undefined || q.maxPrice !== undefined) and.push({ price: { gte: q.minPrice, lte: q.maxPrice } });
    if (q.pieces) and.push({ pieces: { gte: q.pieces } });
    if (q.isLimitedEdition) and.push({ isLimitedEdition: true });
    if (q.available) and.push({ inventory: { stock: { gt: 0 } } });
    if (q.featured) and.push({ isFeatured: true });
    if (q.need) and.push(this.needFilter(q.need));

    return and.length ? { AND: and } : {};
  }

  private needFilter(need: string): Prisma.ProductWhereInput {
    const normalized = need.toLowerCase();
    if (normalized === 'sets') return { OR: [{ presentation: { contains: 'set', mode: 'insensitive' } }, { name: { contains: 'set', mode: 'insensitive' } }] };
    if (normalized === 'llaveros') return { OR: [{ presentation: { contains: 'llavero', mode: 'insensitive' } }, { name: { contains: 'llavero', mode: 'insensitive' } }] };
    if (normalized === 'limited') return { isLimitedEdition: true };
    if (normalized === 'regalo') return { OR: [{ description: { contains: 'regalo', mode: 'insensitive' } }, { presentation: { contains: 'set', mode: 'insensitive' } }] };
    return {};
  }

  private buildOrderBy(sort?: string): Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[] {
    if (sort === 'price_asc') return { price: 'asc' };
    if (sort === 'price_desc') return { price: 'desc' };
    if (sort === 'discount') return { previousPrice: 'desc' };
    if (sort === 'featured') return [{ isFeatured: 'desc' }, { updatedAt: 'desc' }];
    if (sort === 'smart') return [{ isFeatured: 'desc' }, { price: 'desc' }];
    return { createdAt: 'desc' };
  }

  private variantCreateData(dto: ProductVariantDto, index: number): Prisma.ProductVariantCreateWithoutProductInput {
    return {
      sku: dto.sku?.trim() || undefined,
      colorName: dto.colorName.trim(),
      colorHex: dto.colorHex,
      stock: dto.stock ?? 0,
      reserved: dto.reserved ?? 0,
      lowStockThreshold: dto.lowStockThreshold ?? 3,
      sortOrder: dto.sortOrder ?? index,
      isActive: dto.isActive ?? true,
    };
  }

  private async replaceVariants(productId: string, variants: ProductVariantDto[]) {
    const existing = await this.prisma.productVariant.findMany({ where: { productId }, select: { id: true } });
    const used = await this.prisma.orderItem.findMany({ where: { variantId: { in: existing.map((variant) => variant.id) } }, select: { variantId: true } });
    const usedIds = new Set(used.map((item) => item.variantId).filter(Boolean));

    for (const variant of existing) {
      if (usedIds.has(variant.id)) {
        await this.prisma.productVariant.update({ where: { id: variant.id }, data: { isActive: false } });
      } else {
        await this.prisma.productVariant.delete({ where: { id: variant.id } });
      }
    }
    if (variants.length) {
      await this.prisma.productVariant.createMany({
        data: variants.map((variant, index) => ({ productId, ...this.variantCreateData(variant, index) })),
      });
    }
    await this.syncProductInventory(productId);
  }

  private async syncProductInventory(productId: string) {
    const totals = await this.prisma.productVariant.aggregate({
      where: { productId, isActive: true },
      _sum: { stock: true, reserved: true },
    });
    const count = await this.prisma.productVariant.count({ where: { productId, isActive: true } });
    if (count === 0) return;
    await this.prisma.inventory.upsert({
      where: { productId },
      update: { stock: totals._sum.stock ?? 0, reserved: totals._sum.reserved ?? 0 },
      create: { productId, stock: totals._sum.stock ?? 0, reserved: totals._sum.reserved ?? 0 },
    });
  }
}
