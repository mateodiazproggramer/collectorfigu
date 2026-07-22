import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Query, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { RoleName } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateProductDto, UpdateProductVariantDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { CatalogOptionDto } from './dto/catalog-option.dto';
import { ProductsService } from './products.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private products: ProductsService) {}

  @Get() findAll(@Query() query: QueryProductsDto) { return this.products.findAll(query); }

  @Get('options')
  options() { return this.products.catalogOptions(); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Get('admin/inventory')
  adminFindAll(@Query() query: QueryProductsDto) { return this.products.adminFindAll(query); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Get('admin/options')
  adminOptions() { return this.products.adminOptions(); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="plantilla-inventario-collectorfigu.xlsx"')
  @Get('admin/import/template')
  async importTemplate() {
    return new StreamableFile(await this.products.buildInventoryTemplate());
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  @Post('admin/import')
  importInventory(@UploadedFile() file: Express.Multer.File | undefined, @Body() body: { commit?: string }) {
    return this.products.importInventory(file, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Post('admin/brands')
  createBrand(@Body() dto: CatalogOptionDto) { return this.products.createBrand(dto.name); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Patch('admin/brands/:id')
  updateBrand(@Param('id') id: string, @Body() dto: CatalogOptionDto) { return this.products.updateBrand(id, dto.name); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Delete('admin/brands/:id')
  deleteBrand(@Param('id') id: string) { return this.products.deleteBrand(id); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Post('admin/categories')
  createCategory(@Body() dto: CatalogOptionDto) { return this.products.createCategory(dto.name); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Patch('admin/categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: CatalogOptionDto) { return this.products.updateCategory(id, dto.name); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Delete('admin/categories/:id')
  deleteCategory(@Param('id') id: string) { return this.products.deleteCategory(id); }

  @Get(':slug') findOne(@Param('slug') slug: string) { return this.products.findOne(slug); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Post() create(@Body() dto: CreateProductDto) { return this.products.create(dto); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  @Post(':id/images')
  addImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Body() body: { alt?: string; isMain?: string; variantId?: string }) {
    return this.products.addImage(id, file, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Post(':id/variants')
  addVariant(@Param('id') id: string, @Body() dto: UpdateProductVariantDto) {
    return this.products.addVariant(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Patch(':id/variants/:variantId')
  updateVariant(@Param('id') id: string, @Param('variantId') variantId: string, @Body() dto: UpdateProductVariantDto) {
    return this.products.updateVariant(id, variantId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Delete(':id/variants/:variantId')
  deleteVariant(@Param('id') id: string, @Param('variantId') variantId: string) {
    return this.products.deleteVariant(id, variantId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Patch(':id') update(@Param('id') id: string, @Body() dto: Partial<CreateProductDto>) { return this.products.update(id, dto); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  @Patch(':id/images/:imageId')
  updateImage(@Param('id') id: string, @Param('imageId') imageId: string, @UploadedFile() file: Express.Multer.File | undefined, @Body() body: { alt?: string; isMain?: string; sortOrder?: string; variantId?: string }) {
    return this.products.updateImage(id, imageId, file, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Delete(':id/images/:imageId')
  deleteImage(@Param('id') id: string, @Param('imageId') imageId: string) {
    return this.products.deleteImage(id, imageId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Delete(':id') remove(@Param('id') id: string) { return this.products.deactivate(id); }
}
