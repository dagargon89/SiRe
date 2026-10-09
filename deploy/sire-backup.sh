#!/bin/bash
# SiRe — respaldo diario: base de datos + fotos de evidencias.
# Instalar en /usr/local/bin/sire-backup.sh (755) y deploy/crontab-backup en
# /etc/cron.d/sire-backup (644, root:root).
# Las credenciales se toman del entorno DEL CONTENEDOR (no se exponen en el host).
set -euo pipefail

DEST=/var/backups/sire
EVIDENCIAS=/var/www/SiRe/apps/api/writable/evidencias
RETENCION_DIAS=30

mkdir -p "$DEST"
chmod 700 "$DEST"
STAMP=$(date +%F_%H%M)

DB="$DEST/sire_db_${STAMP}.sql.gz"
docker exec sire-mysql sh -c \
  'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers "$MYSQL_DATABASE"' \
  | gzip > "$DB"

FOTOS="$DEST/sire_evidencias_${STAMP}.tar.gz"
if [ -d "$EVIDENCIAS" ]; then
  tar -czf "$FOTOS" -C "$(dirname "$EVIDENCIAS")" "$(basename "$EVIDENCIAS")"
else
  FOTOS="(sin carpeta de evidencias)"
fi

# Retención local. Están en el mismo disco: protegen contra errores, no contra
# la pérdida del servidor. Se recomienda además una copia fuera del servidor.
find "$DEST" -name 'sire_*' -mtime +"$RETENCION_DIAS" -delete

echo "$(date '+%F %T') backup OK: $DB ($(du -h "$DB" | cut -f1)) · $FOTOS"
