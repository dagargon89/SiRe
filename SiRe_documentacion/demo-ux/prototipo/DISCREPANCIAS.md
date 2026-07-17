# Discrepancias prototipo ↔ doc 08 (design system)

**Fecha:** 2026-07-17 · **Origen:** import de `SiRe Prototipo.dc.html` (proyecto Claude Design "Propuestas de diseño login", David García).

Regla aplicada (plan aprobado, Sprint D): **para lo visual manda el prototipo**; el doc 08 queda superado en color/tipografía y debe re-sincronizarse.

## 1. Paleta de color

El prototipo NO usa la paleta tentativa del doc 08 (indigo `#4f46e5` + Inter). Usa una identidad navy + teal:

| Rol | doc 08 (superado) | Prototipo (vigente) — claro | Prototipo — oscuro |
|---|---|---|---|
| primary | `#4f46e5` | `#16334f` (navy) | `#2e7d9a` |
| primary-hover | `#4338ca` | `#1e4468` | `#3b93b3` |
| accent | `#0d9488` | `#2e7d9a` | `#5fb3d1` |
| success | `#15803d` | `#2e7d5a` | `#5bb58c` |
| warning | `#b45309` | `#b07a1e` | `#d9a94e` |
| danger | `#b91c1c` | `#b3413a` | `#d96a62` |
| bg | `#f8fafc` | `#f2f6f9` | `#0f1720` |
| surface | `#ffffff` | `#ffffff` | `#182430` |
| surface-2 | `#f1f5f9` | `#edf3f8` | `#1e2c3a` |
| border | `#e2e8f0` | `#d8e2eb` | `#2a3a4a` |
| text | `#0f172a` | `#14212e` | `#e6edf3` |
| text-muted | `#475569` | `#5b6b7a` | `#8ca0b3` |
| sidebar | (=surface) | `#16334f` | `#0b1520` |
| sidebar-text | — | `#a9c3da` | `#7fa0be` |

Notas:
- El prototipo no define un token `info` separado: usa el acento (`#2e7d9a`) para lo informativo.
- En modo oscuro el `primary` pasa de navy a teal (`#2e7d9a`).

## 2. Tipografía

| | doc 08 (superado) | Prototipo (vigente) |
|---|---|---|
| Sans | Inter | **Public Sans** |
| Mono | (no especificada) | **IBM Plex Mono** |

## 3. Decisión de implementación

- `apps/web/src/styles/theme.css` implementa los valores del prototipo bajo los nombres `--sire-*` ya cableados a Tailwind (`bg-primary`, `text-ink`, etc.), de modo que el resto del código usa utilidades estables.
- Se mantiene el mecanismo de tema del doc 08: `data-theme` en `<html>` + `prefers-color-scheme` como default (el prototipo usaba `data-sire` en un `div`; se adapta a `<html>`).
- **Pendiente (opcional):** re-sincronizar el doc 08 §2/§4 con estos valores para que la documentación no divergir del código.
