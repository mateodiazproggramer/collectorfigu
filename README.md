# CollectorFigu

Plataforma web para **CollectorFigu**, tienda de Bogotá, Colombia dedicada a la venta de figuras coleccionables armables compatibles con bloques tipo LEGO (no oficiales), de casi cualquier fandom: anime, superhéroes, películas, series, gaming, deportes y ediciones de temporada. Complementa el canal de venta existente por catálogo Treinta e Instagram [@collectorfigu](https://www.instagram.com/collectorfigu/), con carrito, checkout, pagos Wompi, cupones, reseñas, analítica, captura de leads y CTA de WhatsApp siempre visible.

## Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: NestJS, Node.js, TypeScript
- Base de datos: PostgreSQL
- ORM: Prisma
- Autenticación: JWT, Google Login opcional
- Imágenes: Cloudinary
- Pagos: Wompi, transferencia bancaria, contraentrega
- Despliegue: Docker + VPS Linux

## Estructura

```txt
apps/
  api/        Backend NestJS + Prisma + Swagger
  web/        Frontend Next.js App Router + Tailwind
docs/
  API.md      Contrato funcional de endpoints
  ERD.md      Modelo entidad-relación en Mermaid
scripts/
  deploy.sh   Script base de despliegue VPS
```

## Inicio rápido local

1. Copiar variables de entorno (ya existe un `.env` local listo para desarrollo, pero puedes regenerarlo):

```bash
cp .env.example .env
```

2. Levantar PostgreSQL, API y Web:

```bash
docker compose up --build
```

3. Ejecutar migraciones y seed dentro del contenedor API (el comando `web`/`api` del compose ya corre `prisma migrate deploy` y `npm run seed` automáticamente al iniciar; si necesitas repetirlo manualmente):

```bash
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run seed
```

4. URLs locales:

- Frontend: http://localhost:2026
- API: http://localhost:4000/api/v1
- Swagger: http://localhost:4000/docs
- PostgreSQL: localhost:5432

## Usuarios de prueba

```txt
Admin: admin@collectorfigu.test / Admin123*
Cliente: cliente@collectorfigu.test / Cliente123*
```

## Flujo de negocio recomendado

1. Administrador crea franquicias (marcas), presentaciones (categorías) y productos.
2. Cada producto tiene inventario, imágenes, personaje, presentación, número de piezas, edición limitada y especificaciones.
3. Cliente agrega productos al carrito o consulta por WhatsApp.
4. Checkout crea orden en estado PENDIENTE.
5. Si paga con Wompi, la API genera referencia y firma de integridad.
6. Wompi notifica webhook.
7. Backend valida firma, actualiza pago y cambia pedido a PAGADO.
8. Admin gestiona preparación, envío y entrega desde el panel administrativo.

## Seguridad aplicada en la base

- Hash de contraseñas con bcrypt.
- JWT con roles ADMIN y CUSTOMER.
- DTOs + ValidationPipe en NestJS.
- Helmet, CORS restringible, sanitización por DTOs.
- Webhooks Wompi con validación de checksum.
- Auditoría en acciones administrativas.
- Preparado para CSRF si se decide usar JWT en cookies httpOnly.

## Pendientes obligatorios antes de producción

- Configurar dominio HTTPS real.
- Definir costo de envío por ciudad/departamento.
- Configurar llaves reales de Wompi.
- Configurar Cloudinary con carpeta por ambiente.
- Configurar el número real de WhatsApp del negocio (`NEXT_PUBLIC_WHATSAPP_NUMBER`).
- Configurar correo real de soporte (`MAIL_FROM`, `SUPPORT_REQUEST_EMAIL`).
- Agregar backups automáticos PostgreSQL.
- Agregar rate limit por IP y usuario.
- Agregar pruebas E2E del checkout y webhooks.

## Identidad visual aplicada al frontend

El frontend incorpora la imagen corporativa de **CollectorFigu**:

- Logo original en `apps/web/public/brand/collectorfigu-logo.png`.
- Logo para hero en `apps/web/public/brand/collectorfigu-logo-hero.png`.
- Wordmark para encabezado en `apps/web/public/brand/collectorfigu-wordmark.png`.
- Símbolo para favicon, tarjetas y estados visuales en `apps/web/public/brand/collectorfigu-symbol.png`.
- Paleta principal: negro/tinta (`#0B0B10`), violeta (`#6C3CE9` / `#4B21B8`), amarillo stud (`#FFC933`) y lavanda suave (`#EFEAFE`).
- Componentes visuales actualizados: header, footer, hero, catálogo por franquicia, detalle de producto, carrito, checkout y panel admin.

## Catálogo y mecánica comercial

- Franquicias disponibles: Dragon Ball, Naruto, One Piece, Demon Slayer, Caballeros del Zodiaco, Marvel, DC, Star Wars, Harry Potter, Disney, Stranger Things, Simpsons, Looney Tunes, Toy Story, Minecraft, League of Legends, Deportes y Especiales (Halloween/Navidad).
- Presentaciones: figura individual, sets x2/x4, llaveros armables, bloques sueltos, decoración de pared y ediciones especiales.
- Mecánica de venta inspirada en Pop Mart/Funko: precio de entrada bajo, badges de "Nuevo en la colección" y "Edición limitada", secciones por franquicia y CTA de WhatsApp siempre visible para complementar el canal de Instagram/Treinta.
