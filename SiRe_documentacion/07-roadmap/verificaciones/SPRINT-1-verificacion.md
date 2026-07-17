# Sprint 1 — Verificación de cierre (catálogos)

**Fecha:** 2026-07-17

## Entregables

| Ítem | Estado | Evidencia |
|---|---|---|
| CRUD Organizaciones (API) | ✅ | `app/Controllers/Organizaciones.php`, `OrganizacionModel` |
| CRUD Categorías (API) | ✅ | `app/Controllers/Categorias.php`, `CategoriaModel` |
| Usuarios: listar/crear/editar/rol/desactivar (API) | ✅ | `app/Controllers/Usuarios.php` |
| Alta de usuario Firebase + MySQL (atómica + compensación) | ✅ | `Services/Usuarios/CrearUsuarioService` |
| Desactivación real (MySQL + revocación) con rollback | ✅ | `Services/Usuarios/DesactivarUsuarioService` |
| PII restringida (titular o admin) | ✅ | `Services/Usuarios/PoliticaPii` |
| No auto-perjuicio (rol propio / auto-desactivación) | ✅ | reglas en `Usuarios` controller / servicio |
| Claves únicas de 3 letras (normalizadas a mayúsculas) | ✅ | validación en modelos + normalización en controllers |
| Abstracción FirebaseAdmin (mockeable) | ✅ | `App\Auth\FirebaseAdmin` + `KreaitFirebaseAdmin` + `FakeFirebaseAdmin` |
| Frontend: AppShell (sidebar+topbar 1:1, nav por rol) | ✅ | `apps/web/src/layout/AppShell.tsx` |
| Frontend: pantallas Organizaciones, Categorías, Usuarios, Perfil | ✅ | `apps/web/src/pages/*`, `components/CatalogoClaves` |
| Enrutado por rol (react-router) | ✅ | `apps/web/src/App.tsx` |

## Pruebas (gate)

**Backend — PHPUnit: 27/27 verdes, 75 aserciones** (14 previas + 13 de Sprint 1). Cubre:
- RBAC: Custodio/Auditor mutando catálogos → 403; cualquier rol lista.
- PII: Custodio sobre ficha ajena → 403 `sin_permiso_pii`; titular y admin → 200.
- No auto-perjuicio: cambiar rol propio → 403 `no_auto_rol`; auto-desactivación → 403 `no_auto_desactivar`.
- Unicidad de clave → 422; clave inválida (longitud/no-alfabética) → 422.
- Alta de usuario → 201 (crea en Firebase-doble + MySQL); desactivación → 204 + revocación de tokens.

**Frontend — Vitest: 22/22 verdes** (theme, componentes base, App, Login, CatalogoClaves, AppShell nav por rol).

**E2E real (backend + token de Google):**
- `POST /organizaciones` (admin) → 201 con salida **tipada** (`id:int`, `is_active:bool`, clave en mayúsculas).
- `GET /organizaciones` → tipos correctos (FCD `is_active:false`).
- Clave duplicada → 422.

## Bug encontrado y corregido durante el gate

El API devolvía `is_active` como string `"1"/"0"`; en JS `"0"` es *truthy*, por lo que el badge marcaba «Activa» a registros inactivos. **Corregido**: los controllers de Organizaciones/Categorías/Usuarios proyectan la salida al contrato (`id:int`, `is_active:bool`). Aserción de regresión añadida al gate.
