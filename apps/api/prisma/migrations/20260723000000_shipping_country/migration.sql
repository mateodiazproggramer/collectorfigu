-- Agrega el pais de entrega a la direccion de envio, usado para bloquear pedidos
-- fuera de Colombia y calcular la tarifa de envio por destino (Bogota vs. resto del pais).
ALTER TABLE "ShippingAddress" ADD COLUMN "country" TEXT NOT NULL DEFAULT 'CO';
