# Hardening de preproduccion

## Infraestructura

Se agrego `docker-compose.prod.yml` con PostgreSQL interno, API, web y Caddy. Solo Caddy expone puertos 80/443. API, web y base de datos quedan en red interna.

Los Dockerfile de API y web compilan en produccion y arrancan con `start:prod` y `start`.

## Seguridad

La API valida variables criticas al iniciar en `NODE_ENV=production`: JWT fuerte, CORS explicito, Cloudinary, Wompi, `DATABASE_URL` y `FRONTEND_URL` HTTPS. Swagger solo se monta fuera de produccion o si `ENABLE_SWAGGER=true`.

El archivo `.env` no esta trackeado. Si algun secreto fue subido alguna vez, debe rotarse en Gmail, Wompi, Cloudinary y base de datos.

## Inventario

Wompi reserva inventario al crear orden `PENDING`. Si la orden sigue pendiente mas de `ORDER_PENDING_TTL_MINUTES` (30 por defecto), el job interno la cancela y libera reserva.

Contraentrega reserva al crear pedido y descuenta stock solo cuando admin cambia a `PAID`.

## Identificadores

Ordenes y reparaciones usan formato legible:

```txt
ORD-YYYYMMDD-CODIGO
REP-YYYYMMDD-CODIGO
```

## Wompi

El frontend no decide si una orden esta pagada. El webhook valida firma, monto y moneda antes de marcar pago y descontar inventario.

URL de webhook:

```txt
https://tudominio.com/api/v1/payments/wompi/webhook
```

## Seed

En desarrollo se crean datos demo. En produccion solo se crea admin si existen `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FIRST_NAME` y `ADMIN_LAST_NAME`.

## Riesgos conocidos

`npm audit --omit=dev` en la imagen web aun reporta una vulnerabilidad moderada de `postcss` empaquetada dentro de Next.js 15.5.19. La dependencia directa `postcss` fue subida a `^8.5.10`, pero el reporte persiste por la copia interna de Next. Revisar actualizacion de Next cuando exista version estable corregida o validar mitigacion oficial antes de produccion final.
