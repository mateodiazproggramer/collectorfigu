# Modelo entidad-relación

```mermaid
erDiagram
  User ||--o{ UserRole : has
  Role ||--o{ UserRole : assigned
  User ||--o| Customer : profile
  User ||--o| Cart : owns
  User ||--o{ Order : places
  User ||--o{ RepairRequest : requests
  User ||--o{ Notification : receives
  User ||--o{ AuditLog : performs

  Customer ||--o{ ShippingAddress : has
  Brand ||--o{ Product : manufactures
  Category ||--o{ Product : groups
  Product ||--o{ ProductImage : has
  Product ||--|| Inventory : tracks
  Product ||--o{ CartItem : in
  Product ||--o{ OrderItem : sold_as

  Cart ||--o{ CartItem : contains
  Coupon ||--o{ Cart : applied_to
  Coupon ||--o{ Order : applied_to

  Order ||--o{ OrderItem : contains
  Order ||--o{ Payment : paid_by
  ShippingAddress ||--o{ Order : ships_to

  RepairRequest ||--o{ RepairImage : has
  RepairRequest ||--o{ RepairUpdate : progresses

## Decisiones de diseño

- `Product.price` y totales usan `Decimal(12,2)` para dinero.
- `Inventory.reserved` permite separar unidades comprometidas en carritos/órdenes pendientes.
- `Product.specifications` es JSON para flexibilidad: pantalla, cámara, procesador, batería, red, etc.
- `RepairRequest` permite IMEI opcional y evidencia fotográfica.
- `AuditLog` guarda trazabilidad administrativa.
- `Payment.providerPayload` conserva respuesta de Wompi o evidencia de transferencia.
