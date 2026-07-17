# ADR-001 — Stack del proyecto: React + Vite + CodeIgniter 4 + MySQL

| Campo | Valor |
|---|---|
| ADR | 001 |
| Título | Adopción del stack React/CI4 (sustituye Laravel/Livewire) |
| Estado | Aceptado |
| Fecha | 2026-07-17 |
| Depende de | [00_auditoria_fuentes](../../00-fuentes/00_auditoria_fuentes.md) (H-01) |

## 1. Contexto

El material previo del proyecto (GUIDELINE y SOW v1.0, mayo 2026) especificaba un monolito **Laravel 13 + Livewire 4 + Flux UI + Spatie Permission**. La Definición de Producto del 17-jul-2026 (§8) fija como **dado** el stack destino **React + Vite + CI4 + MySQL**, alineado con el estándar tecnológico actual de Plan Juárez y con proyectos hermanos (Panel de Acuerdos, Portal Ejecutivo BQS, Sistema MEL) que ya operan sobre CI4 + React. Mantener Laravel implicaría divergir del estándar organizacional, duplicar conocimiento operativo y perder la reutilización de patrones ya probados (verificación de token Firebase, `spark` cron, contrato de API tipado).

## 2. Decisión

Adoptar una arquitectura **SPA + API REST desacoplada**.

| Aspecto | Antes (F2/F3) | Ahora (decisión) |
|---|---|---|
| Framework backend | Laravel 13 | CodeIgniter 4.7 (PHP 8.3) |
| Capa de UI | Livewire 4 + Flux (server-rendered) | React 19 + Vite 7 (SPA) |
| Estilos | Tailwind 4 + Flux | Tailwind 4 (design system propio) |
| ORM / datos | Eloquent | CI4 Models / Query Builder |
| RBAC | Spatie Permission | Policies/Filters propios de CI4 |
| Estado remoto (front) | — (server-driven) | TanStack Query + `lib/api.ts` |
| Auth | Sanctum (sesión) | Firebase Auth + verificación en CI4 (ADR-002) |
| Caché/colas | Redis + Horizon | Redis + `spark` cron |

## 3. Mapeo de conceptos (Laravel → CI4/React)

| Laravel/Livewire | Equivalente CI4/React |
|---|---|
| Componente Livewire full-page | Ruta React + componente + hook TanStack Query |
| Action class (`execute()`) | Service/Action de CI4 (método único, transaccional) |
| Eloquent Model + `with()` | CI4 Model + `join`/`whereIn` batched (anti N+1) |
| Policy (Spatie) | Policy propia invocada desde Controller/Filter |
| Form Request | Validación de CI4 (`$this->validate()` / reglas en Service) |
| Middleware `auth`/`role` | Filter de CI4 (`FirebaseAuthFilter`, `RoleFilter`) |
| Queue + Horizon | Cola ligera en Redis + comando `spark` en cron |
| Blade/Flux | Componentes React + Tailwind (design system doc 08) |

## 4. Consecuencias

**Positivas**
- Alineación con el estándar de Plan Juárez; reutilización directa de patrones de Panel de Acuerdos.
- Desacople front/back: el frontend se despliega estático (CDN/servidor web), el backend escala aparte.
- Contrato de API tipado (`ApiClient`) como fuente única compartida por demo, front y back.

**Negativas**
- Se descarta todo el diseño de F2 (componentes, RBAC Spatie, esquema Eloquent); el modelo de datos se rehace (doc 03).
- Dos bases de código (SPA + API) en vez de un monolito: más superficie de despliegue y CORS que gestionar.
- El equipo mantiene disciplina anti-N+1 manualmente (sin el `with()` de Eloquent).

**Neutrales**
- MySQL y Redis se conservan como en F2.
- Tailwind se conserva, pero con design system propio en vez de Flux.

## 5. Impacto en documentos

Afecta a **todos**: README, CLAUDE, 01 SRS, 02 arquitectura, 03 datos, 04 seguridad, 05 API, 06 pruebas, 07 roadmap, 08 design system, 09 demo. Los documentos previos (F2/F3) quedan como contexto histórico en `00-fuentes/`.

## 6. Implicaciones de seguridad

CI4 exige configurar manualmente lo que Laravel traía por defecto: CSRF (o su equivalente para API stateless con Bearer token), rate limiting (Redis), cabeceras de seguridad, y el Query Builder con binding de parámetros. Se cubre en el doc 04. El desacople obliga a una política CORS estricta (orígenes permitidos explícitos).

## 7. Plan de migración

No hay migración de datos (base nueva y vacía). La "migración" es de diseño: la documentación se genera desde cero sobre el nuevo stack. Sprint 0 del roadmap establece los cimientos (proyecto CI4, proyecto Vite, Docker de MySQL/Redis, Filter de auth, CI/CD).

---

*ADR-001 · Proyecto SiRe · v1.0 · 2026-07-17*
