# SiRe — Sistema de Resguardos OSC

Aplicación web interna para el control de resguardos (custodia) de activos de un grupo de OSC. Monorepo con frontend SPA y backend API REST.

- **Frontend** — `apps/web` · React 19 + TypeScript + Vite 7 + Tailwind 4 + TanStack Query 5
- **Backend** — `apps/api` · CodeIgniter 4.7 (PHP 8.3+)
- **Infraestructura** — MySQL 8.4 + Redis 7 (vía Docker)
- **Documentación** — `SiRe_documentacion/` (arquitectura, modelo de datos, API, seguridad, pruebas, design system, roadmap)

> La documentación es la fuente de verdad. El DDL (`03-datos`), el contrato `ApiClient` (`05-api`) y los tokens `--sire-*` (`08` design system) rigen el código.

## Requisitos

- Docker + Docker Compose
- PHP 8.3+ y Composer 2 (para `apps/api`)
- Node 20+ y npm (para `apps/web`)

## Arranque local

```bash
# 1) Variables de entorno
cp .env.example .env          # completar credenciales cuando el sprint lo requiera

# 2) Infraestructura (MySQL + Redis)
docker compose up -d
docker compose ps             # esperar healthchecks en "healthy"

# 3) Backend
cd apps/api
composer install
cp env .env                   # config CI4 (DB/Redis/Firebase) — ver .env raíz
php spark migrate
php spark db:seed InitialSeeder
php spark serve --port 8080

# 4) Frontend (otra terminal)
cd apps/web
npm install
npm run dev                   # http://localhost:5173
```

## Pruebas (gate por sprint — deben pasar al 100% antes de avanzar)

```bash
# Backend
cd apps/api && vendor/bin/phpunit

# Frontend
cd apps/web && npm run test        # Vitest
cd apps/web && npx playwright test  # E2E
```

## Estructura

```
apps/web/    SPA React (pantallas, componentes, lib/api.ts, styles/theme.css)
apps/api/    API CI4 (Filters, Controllers, Services, Models, Migrations, Seeds, Commands)
docker-compose.yml   MySQL 8.4 + Redis 7
SiRe_documentacion/  Documentación del proyecto
```
