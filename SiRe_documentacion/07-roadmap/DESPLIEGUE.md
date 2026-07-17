# Guía de despliegue — SiRe

Arquitectura de despliegue: **SPA estática** (`apps/web/dist`) servida por Nginx + **API CI4** (`apps/api`) sobre Nginx + PHP-FPM, con **MySQL 8.4** y **Redis 7**. Cron diario para alertas.

## 1. Requisitos del servidor

- Nginx, PHP 8.3 (FPM) con extensiones: `mysqli, intl, mbstring, bcmath, gmp, gd, redis`.
- Composer 2, Node 20 (solo para build del front).
- MySQL 8.4 y Redis 7 (servicios propios o contenedores).

## 2. Variables de entorno

Copiar `.env.example` → `.env` (raíz) y `apps/api/env` → `apps/api/.env`, y completar:
- **DB / Redis**: host, puerto, credenciales.
- **Firebase**: `firebase.projectId`, `firebase.storageBucket`, y el service account en `apps/api/writable/firebase-service-account.json` (fuera del webroot, nunca commiteado).
- **CORS**: `cors.allowedOrigins` = dominio del frontend (ej. `https://sire.example.org`).
- **Frontend (build)**: `VITE_API_BASE_URL` + `VITE_FIREBASE_*`.
- **SMTP**: `SMTP_HOST/PORT/USER/PASS/FROM` para las alertas.
- `CI_ENVIRONMENT = production` en `apps/api/.env`.

## 3. Backend (apps/api)

```bash
cd apps/api
composer install --no-dev --optimize-autoloader
php spark migrate
php spark db:seed InitialSeeder        # solo primera vez (datos base)
php spark sire:crear-admin --email ... --org AVZ   # administrador real
```
Servir `apps/api/public` con Nginx + PHP-FPM (ver `deploy/nginx-api.conf`).

## 4. Frontend (apps/web)

```bash
cd apps/web
npm ci
npm run build          # genera apps/web/dist con las VITE_* horneadas
```
Servir `apps/web/dist` con Nginx (ver `deploy/nginx-web.conf`).

## 5. Cron de alertas

Instalar `deploy/crontab` (o su equivalente): ejecuta `php spark resguardos:alertas-prestamos`
diariamente a las 07:00 en TZ `America/Ciudad_Juarez`.

## 6. Opción Docker

- `apps/api/Dockerfile` — imagen PHP-FPM de producción.
- `apps/web/Dockerfile` — build + Nginx (pasar `VITE_*` como `--build-arg`).
- Orquestar con MySQL + Redis + un Nginx frontal (reverse proxy a la API y al SPA).

## 7. Post-despliegue (checklist)

- [ ] `GET /api/v1/health` → `{status:ok}`.
- [ ] Login real end-to-end.
- [ ] CORS solo permite el dominio del front.
- [ ] Rate limiting activo (429 al exceder).
- [ ] Cron programado y con logs.
- [ ] Backups de MySQL configurados.
- [ ] Rotar cualquier credencial que se haya expuesto durante el desarrollo.
