# Sprint 0 — Verificación de cierre (cimientos de seguridad)

**Fecha:** 2026-07-17

## Entregables

| Ítem | Estado | Evidencia |
|---|---|---|
| Docker MySQL 8.4 + Redis 7 | ✅ | `docker-compose.yml`; healthchecks `healthy` |
| Migraciones (9 tablas, 1:1 doc 03) | ✅ | `app/Database/Migrations/..._CreateInitialSchema.php`; `php spark migrate` OK |
| Verificación de ID token (kreait + JWKS en Redis) | ✅ | `app/Auth/FirebaseTokenVerifier.php`, `Config/Services::tokenVerifier` |
| Abstracción mockeable del verificador | ✅ | `App\Auth\TokenVerifier` + `Tests\Support\Auth\FakeTokenVerifier` |
| FirebaseAuthFilter (401/403) | ✅ | `app/Filters/FirebaseAuthFilter.php` |
| RoleFilter (RBAC) | ✅ | `app/Filters/RoleFilter.php` |
| CorsFilter (lista blanca + preflight) | ✅ | `app/Filters/CorsFilter.php` (global) |
| RateLimitFilter (Redis, 429 + Retry-After) | ✅ | `app/Filters/RateLimitFilter.php` |
| Cabeceras de seguridad | ✅ | `secureheaders` global (Config/Filters) |
| InitialSeeder (bloque JSON doc 09 sin transformar) | ✅ | `app/Database/Seeds/InitialSeeder.php` + `seed_data.json` |
| CI (GitHub Actions: MySQL+Redis, PHPUnit, Vitest, audits) | ✅ | `.github/workflows/ci.yml` |
| Endpoints base | ✅ | `GET /api/v1/health`, `GET /api/v1/me` |
| Frontend: SDK Firebase + AuthProvider + ApiClient con token | ✅ | `apps/web/src/lib/{firebase,auth,apiClient}.ts` |
| Frontend: pantalla Login 1:1 del prototipo | ✅ | `apps/web/src/pages/Login.tsx` |
| Comando de provisión de administrador (Firebase + perfil) | ✅ | `app/Commands/CrearAdmin.php` (`php spark sire:crear-admin`) |

## Pruebas (gate)

**Backend — PHPUnit: 14/14 verdes, 42 aserciones.**
- `Sprint0BorderTest` (8): health 200; `/me` sin token → 401 `token_ausente`; token inválido → 401 `token_invalido`; usuario inexistente/inactivo → 403 `cuenta_inactiva`; usuario activo → 200 con rol; CORS preflight origen permitido → 204 + ACAO; origen no permitido → sin ACAO; rate limit → 429 `rate_limit`.
- `InitialSeederTest` (1): siembra completa (3/3/5/5/6), escenarios de estado, secuencia coherente, préstamo vencido sin aviso `vencido`.
- Tests de ejemplo del framework (5): verdes.

**Frontend — Vitest: 15/15 verdes** (theme, componentes base, App enrutado por sesión, Login + mapeo de errores).

## Login end-to-end real — VERIFICADO ✅ (2026-07-17)

- Service account colocado; proyecto Firebase `sire-sistema-de-resguardos` conectado.
- Administrador provisionado: `php spark sire:crear-admin` creó el usuario en Firebase (uid `0sW6jOhthDaU4LUJdtRd9W0cJdb2`) y el perfil local admin activo (`dgarcia@planjuarez.org`, org AVZ).
- Prueba real contra el backend en `:8080`:
  - `GET /health` → `{status:ok, db:ok, redis:ok}`.
  - ID token real de Google (Firebase REST `signInWithPassword`) → `GET /me` → **200** con `David García · administrador · organizacion_id 1`.
  - Token inválido → **401**.

## Otros (no bloqueantes del gate)
- **Driver de cobertura** (pcov/xdebug): PHPUnit corre sin driver local; se habilita en CI (pcov) y en el hardening de Sprint 6.
- **Revocación de tokens en Firebase** al desactivar: el acceso ya se corta por `is_active` en el filtro; la revocación vía Firebase Admin se implementa con `DesactivarUsuarioService` en Sprint 1.
