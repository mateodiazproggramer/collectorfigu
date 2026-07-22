# Backups de produccion

Este proyecto usa PostgreSQL dentro del VPS. El volumen de Docker conserva datos, pero no reemplaza un backup real. No uses `docker compose down -v` en produccion porque elimina volumenes y puede borrar la base de datos.

## Backup manual

```bash
mkdir -p /opt/backups/cellstore
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres pg_dump -U cellstore cellstore | gzip > /opt/backups/cellstore/cellstore_$(date +%F_%H-%M).sql.gz
```

Si cambiaste `POSTGRES_USER` o `POSTGRES_DB`, ajusta el comando.

## Backup automatico con cron

Edita el cron del servidor:

```bash
crontab -e
```

Agrega una tarea diaria:

```bash
15 2 * * * cd /opt/cellstore && docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres pg_dump -U cellstore cellstore | gzip > /opt/backups/cellstore/cellstore_$(date +\%F).sql.gz
```

## Retencion sugerida

```bash
find /opt/backups/cellstore -type f -name "*.sql.gz" -mtime +14 -delete
```

## Restauracion basica

Deten la API y web antes de restaurar:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml stop api web
gunzip -c /opt/backups/cellstore/cellstore_YYYY-MM-DD.sql.gz | docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres psql -U cellstore -d cellstore
docker compose --env-file .env.production -f docker-compose.prod.yml up -d api web
```

## Copias fuera del VPS

Copia los backups a otro destino: otro servidor, almacenamiento S3 compatible, Google Drive empresarial o un bucket con versionado. Un backup que vive solo dentro del mismo VPS no protege contra perdida del servidor.
