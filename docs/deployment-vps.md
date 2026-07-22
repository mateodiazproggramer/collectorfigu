# Despliegue en VPS con Docker Compose, Caddy y Cloudflare

Guia base para Ubuntu 24.04. Reemplaza `tudominio.com`, rutas y credenciales por datos reales del negocio.

## 1. Crear VPS

Usa Ubuntu 24.04 LTS. Recomendado minimo: 2 GB RAM, 1 vCPU, 30 GB SSD. Si el catalogo crece o hay muchas imagenes, sube RAM y disco.

## 2. Instalar Docker

```bash
sudo apt update
sudo apt install -y ca-certificates curl git ufw
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Cierra sesion y vuelve a entrar.

## 3. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

No abras PostgreSQL al publico.

## 4. Clonar repo

```bash
cd /opt
git clone https://github.com/chatgptdillandiaz/technoglass-ecommerce.git
cd technoglass-ecommerce
git checkout main
```

## 5. Crear variables

```bash
cp .env.production.example .env.production
nano .env.production
```

Completa Cloudinary, Wompi, SMTP, dominio, secretos JWT y admin inicial. No subas `.env.production` a GitHub.

## 6. Cloudflare

Apunta el registro `A` del dominio al IP del VPS. Usa modo SSL/TLS `Full` o `Full strict`. Desactiva proxy temporalmente si necesitas diagnosticar certificados, luego puedes activarlo.

## 7. Dominio y Caddy

En `.env.production` define:

```env
DOMAIN=tudominio.com
CADDY_EMAIL=admin@tudominio.com
FRONTEND_URL=https://tudominio.com
CORS_ORIGIN=https://tudominio.com
NEXT_PUBLIC_SITE_URL=https://tudominio.com
NEXT_PUBLIC_API_URL=https://tudominio.com/api/v1
```

## 8. Levantar produccion

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

## 9. Logs

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f api
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f web
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f caddy
```

Healthcheck API:

```bash
curl https://tudominio.com/api/v1/health
```

## 10. Wompi webhook

Configura en Wompi:

```txt
https://tudominio.com/api/v1/payments/wompi/webhook
```

El backend valida firma, monto, moneda y actualiza la orden solo desde webhook.

## 11. Backups

Sigue `docs/production-backups.md`. Programa backup diario y copia fuera del VPS.

## 12. Actualizar produccion

```bash
cd /opt/technoglass-ecommerce
git pull origin main
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f api
```

## Primer admin

En produccion el seed no crea usuarios demo. Define `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FIRST_NAME` y `ADMIN_LAST_NAME`, luego ejecuta:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec api npx prisma db seed
```

La contraseña debe tener minimo 12 caracteres e incluir mayuscula, minuscula, numero y simbolo.
