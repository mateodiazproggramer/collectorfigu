# API funcional

Base URL local: `http://localhost:4000/api/v1`

## Auth

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/auth/register` | Público | Registro cliente |
| POST | `/auth/login` | Público | Inicio de sesión JWT |
| GET | `/auth/me` | Autenticado | Perfil actual |

## Productos

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/products` | Público | Listado con filtros |
| GET | `/products/:slug` | Público | Detalle producto |
| POST | `/products` | Admin | Crear producto |
| PATCH | `/products/:id` | Admin | Actualizar producto |
| DELETE | `/products/:id` | Admin | Desactivar producto |

Filtros soportados: `brand`, `model`, `condition`, `minPrice`, `maxPrice`, `storageGb`, `ramGb`, `available`, `q`, `page`, `limit`.

## Carrito

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/cart` | Cliente | Obtener carrito |
| POST | `/cart/items` | Cliente | Agregar producto |
| PATCH | `/cart/items/:id` | Cliente | Cambiar cantidad |
| DELETE | `/cart/items/:id` | Cliente | Eliminar ítem |
| POST | `/cart/coupon` | Cliente | Aplicar cupón |

## Checkout y pedidos

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/orders/checkout` | Cliente | Crear orden desde carrito |
| GET | `/orders/my` | Cliente | Mis pedidos |
| GET | `/orders` | Admin | Todos los pedidos |
| PATCH | `/orders/:id/status` | Admin | Cambiar estado |

## Pagos

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/payments/wompi/signature` | Admin | Generar firma de integridad |
| POST | `/payments/wompi/webhook` | Público/Wompi | Recibir evento Wompi |
| POST | `/payments/manual-transfer` | Cliente | Registrar transferencia |

## Servicio técnico

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/repairs` | Cliente | Crear solicitud |
| GET | `/repairs/my` | Cliente | Mis solicitudes |
| GET | `/repairs` | Admin | Todas las solicitudes |
| POST | `/repairs/:id/updates` | Admin | Agregar avance |
| PATCH | `/repairs/:id/status` | Admin | Cambiar estado |

## Admin

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/admin/dashboard` | Admin | KPIs principales |
| GET | `/admin/reports/top-products` | Admin | Productos más vendidos |
| GET | `/admin/reports/income` | Admin | Ingresos por fecha |
| GET | `/admin/reports/frequent-customers` | Admin | Clientes frecuentes |
| GET | `/admin/reports/repaired-devices` | Admin | Equipos reparados |
