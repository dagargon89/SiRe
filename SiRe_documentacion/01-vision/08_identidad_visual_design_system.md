# 08 — Identidad Visual y Design System

| Campo | Valor |
|---|---|
| Documento | 08 — Identidad Visual y Design System |
| Proyecto | SiRe — Sistema de Resguardos OSC |
| Versión | 1.0 |
| Fecha | 2026-07-17 |
| Depende de | [01_SRS](01_SRS_especificacion_requisitos.md) (RNF-05, RNF-06) |

> **Requisitos dados por David:** interfaz profesional, interactiva, orientada al uso fácil, con **sidebar**, **sección de perfil de usuario**, **modo claro y oscuro** y **responsiva** (mobile-first). Design system **nuevo desde cero** (sin marca previa), con contraste **WCAG 2.1 AA** verificado.

## 1. Identidad de marca

SiRe es una herramienta interna de confianza operativa: su personalidad visual es **sobria, clara y eficiente**. Prioriza legibilidad, jerarquía y densidad de información controlada sobre la ornamentación. El color primario es un **azul índigo** (fiabilidad institucional) acompañado de un **verde teal** para acciones positivas y estados "disponible".

**Antipatrones (evitar):** degradados llamativos, sombras exageradas, más de un color de acento por pantalla, iconografía inconsistente, texto de bajo contraste sobre color, densidad excesiva sin espaciado.

## 2. Paleta y tokens CSS

Todos los colores se consumen como **tokens CSS**; nunca se hardcodean valores fuera de estas variables. Los tokens semánticos cambian entre claro/oscuro; los de marca se mantienen.

```css
:root {
  /* Marca */
  --sire-primary: #4f46e5;         /* indigo 600 */
  --sire-primary-hover: #4338ca;   /* indigo 700 */
  --sire-primary-contrast: #ffffff;
  --sire-accent: #0d9488;          /* teal 600 */

  /* Estados semánticos */
  --sire-success: #15803d;         /* disponible / éxito */
  --sire-warning: #b45309;         /* por vencer / atención */
  --sire-danger:  #b91c1c;         /* vencido / baja / error */
  --sire-info:    #1d4ed8;         /* informativo */

  /* Superficies (modo claro) */
  --sire-bg:        #f8fafc;       /* fondo app */
  --sire-surface:   #ffffff;       /* tarjetas, sidebar */
  --sire-surface-2: #f1f5f9;       /* filas alternas, hover */
  --sire-border:    #e2e8f0;

  /* Texto (modo claro) */
  --sire-text:      #0f172a;       /* principal */
  --sire-text-muted:#475569;       /* secundario */
  --sire-text-invert:#ffffff;

  /* Radios, sombra, foco */
  --sire-radius: 0.5rem;
  --sire-shadow: 0 1px 3px rgba(15, 23, 42, .08), 0 1px 2px rgba(15, 23, 42, .06);
  --sire-focus-ring: 0 0 0 3px rgba(79, 70, 229, .45);
}

:root[data-theme="dark"] {
  --sire-primary: #818cf8;         /* indigo 400 — contraste sobre oscuro */
  --sire-primary-hover: #a5b4fc;
  --sire-primary-contrast: #0b1020;
  --sire-accent: #2dd4bf;

  --sire-success: #4ade80;
  --sire-warning: #fbbf24;
  --sire-danger:  #f87171;
  --sire-info:    #60a5fa;

  --sire-bg:        #0b1020;
  --sire-surface:   #111827;
  --sire-surface-2: #1f2937;
  --sire-border:    #334155;

  --sire-text:      #e5e7eb;
  --sire-text-muted:#94a3b8;
  --sire-text-invert:#0b1020;

  --sire-shadow: 0 1px 3px rgba(0,0,0,.5);
  --sire-focus-ring: 0 0 0 3px rgba(129, 140, 248, .5);
}
```

## 3. Accesibilidad (WCAG 2.1 AA)

| Combinación | Ratio aprox. | Cumple AA |
|---|---|---|
| `--sire-text` #0f172a sobre `--sire-surface` #ffffff | 16.1:1 | ✅ (texto normal) |
| `--sire-text-muted` #475569 sobre #ffffff | 7.4:1 | ✅ |
| `--sire-primary-contrast` #fff sobre `--sire-primary` #4f46e5 | 6.5:1 | ✅ |
| `--sire-danger` #b91c1c sobre #ffffff | 5.9:1 | ✅ |
| Dark: #e5e7eb sobre #111827 | 13.8:1 | ✅ |
| Dark: #0b1020 sobre `--sire-primary` #818cf8 | 6.9:1 | ✅ |

Reglas: foco **siempre visible** (`--sire-focus-ring`); área táctil mínima 44×44 px; color nunca es el único portador de significado (íconos + texto en estados); navegación completa por teclado; `aria-label` en íconos-botón; `prefers-color-scheme` como default del tema, con override manual persistido.

## 4. Tipografía

- **Familia:** `Inter` (UI), fallback `system-ui, -apple-system, Segoe UI, Roboto, sans-serif`. Números tabulares en tablas (`font-variant-numeric: tabular-nums`).
- **Escala:** `--fs-xs .75rem` · `sm .875` · `base 1` · `lg 1.125` · `xl 1.25` · `2xl 1.5` · `3xl 1.875`.
- **Pesos:** 400 texto, 500 énfasis/labels, 600 títulos. Interlínea 1.5 en cuerpo, 1.25 en títulos.

## 5. Espaciado, layout y breakpoints

- **Escala de espaciado (rem):** 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4.
- **Layout:** sidebar fija (240 px) colapsable a íconos (72 px) en tablet; barra superior con buscador global y perfil; contenido con `max-width` cómodo y padding responsivo.
- **Breakpoints (mobile-first):** `sm 640` · `md 768` · `lg 1024` · `xl 1280`. En `< md` la sidebar se vuelve cajón (drawer) accesible desde un botón de menú.

## 6. Componentes (Tailwind 4)

Mínimo 10 componentes base del sistema. Snippets con clases de utilidad + tokens.

### 6.1 Layout con sidebar + perfil
```html
<div class="min-h-screen grid grid-cols-[240px_1fr] max-md:grid-cols-1 bg-[var(--sire-bg)] text-[var(--sire-text)]">
  <aside class="bg-[var(--sire-surface)] border-r border-[var(--sire-border)] p-4 max-md:hidden">
    <div class="font-semibold text-lg mb-6">SiRe</div>
    <nav class="flex flex-col gap-1"><!-- items de navegación --></nav>
    <div class="mt-auto flex items-center gap-3 pt-4 border-t border-[var(--sire-border)]">
      <div class="size-9 rounded-full bg-[var(--sire-primary)] text-[var(--sire-primary-contrast)] grid place-items-center">DG</div>
      <div class="text-sm"><div class="font-medium">David G.</div><div class="text-[var(--sire-text-muted)]">Administrador</div></div>
    </div>
  </aside>
  <main class="p-6"><!-- contenido --></main>
</div>
```

### 6.2 Ítem de navegación (activo)
```html
<a class="flex items-center gap-3 px-3 py-2 rounded-[var(--sire-radius)] text-sm
          hover:bg-[var(--sire-surface-2)] aria-[current=page]:bg-[var(--sire-primary)]
          aria-[current=page]:text-[var(--sire-primary-contrast)]" aria-current="page">
  <svg class="size-5" aria-hidden="true"><!-- icono --></svg> Activos
</a>
```

### 6.3 Botón primario / secundario / peligro
```html
<button class="px-4 py-2 rounded-[var(--sire-radius)] font-medium text-[var(--sire-primary-contrast)]
               bg-[var(--sire-primary)] hover:bg-[var(--sire-primary-hover)]
               focus:outline-none focus:shadow-[var(--sire-focus-ring)] disabled:opacity-50">Guardar</button>
<button class="px-4 py-2 rounded-[var(--sire-radius)] font-medium border border-[var(--sire-border)]
               bg-[var(--sire-surface)] hover:bg-[var(--sire-surface-2)]">Cancelar</button>
<button class="px-4 py-2 rounded-[var(--sire-radius)] font-medium text-white bg-[var(--sire-danger)]">Dar de baja</button>
```

### 6.4 Badge de estado del activo
```html
<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
             text-white bg-[var(--sire-success)]">● Disponible</span>
<!-- asignado: --sire-info · prestado: --sire-accent · mantenimiento: --sire-warning · baja: --sire-danger -->
```

### 6.5 Input con label y error
```html
<label class="block text-sm font-medium mb-1">Número de serie</label>
<input class="w-full px-3 py-2 rounded-[var(--sire-radius)] bg-[var(--sire-surface)]
              border border-[var(--sire-border)] focus:outline-none focus:shadow-[var(--sire-focus-ring)]"
       aria-invalid="true" aria-describedby="serie-err" />
<p id="serie-err" class="text-xs text-[var(--sire-danger)] mt-1">Este campo es obligatorio.</p>
```

### 6.6 Tabla de datos (con números tabulares)
```html
<table class="w-full text-sm [font-variant-numeric:tabular-nums]">
  <thead class="text-left text-[var(--sire-text-muted)] border-b border-[var(--sire-border)]">
    <tr><th class="py-2">Código</th><th>Activo</th><th>Estado</th><th>Custodio</th></tr>
  </thead>
  <tbody>
    <tr class="border-b border-[var(--sire-border)] hover:bg-[var(--sire-surface-2)]">
      <td class="py-2 font-mono">CMP-AVZ-014</td><td>Laptop Dell</td><td><!-- badge --></td><td>—</td>
    </tr>
  </tbody>
</table>
```

### 6.7 Tarjeta KPI (dashboard)
```html
<div class="rounded-[var(--sire-radius)] bg-[var(--sire-surface)] border border-[var(--sire-border)]
            shadow-[var(--sire-shadow)] p-4">
  <div class="text-[var(--sire-text-muted)] text-sm">Préstamos vencidos</div>
  <div class="text-3xl font-semibold text-[var(--sire-danger)]">3</div>
</div>
```

### 6.8 Toggle de tema claro/oscuro
```html
<button aria-label="Cambiar tema" class="size-9 grid place-items-center rounded-[var(--sire-radius)]
        border border-[var(--sire-border)] hover:bg-[var(--sire-surface-2)]"
        onclick="document.documentElement.dataset.theme = document.documentElement.dataset.theme==='dark'?'light':'dark'">
  🌓
</button>
```

### 6.9 Estados de vista (vacío / carga / error)
```html
<!-- vacío --> <div class="text-center text-[var(--sire-text-muted)] py-12">No hay activos que coincidan.</div>
<!-- carga --> <div class="animate-pulse h-8 rounded bg-[var(--sire-surface-2)]"></div>
<!-- error --> <div class="rounded-[var(--sire-radius)] border border-[var(--sire-danger)]
     text-[var(--sire-danger)] p-3 text-sm">No se pudo cargar. Reintenta.</div>
```

### 6.10 Modal / drawer de acción
```html
<div role="dialog" aria-modal="true" class="fixed inset-0 grid place-items-center bg-black/40 p-4">
  <div class="w-full max-w-md rounded-[var(--sire-radius)] bg-[var(--sire-surface)] shadow-[var(--sire-shadow)] p-6">
    <h2 class="text-lg font-semibold mb-4">Asignar activo</h2><!-- form --></div>
</div>
```

### 6.11 Chip de QR / código
```html
<div class="inline-flex items-center gap-2 font-mono text-sm px-2 py-1 rounded bg-[var(--sire-surface-2)]">
  <svg class="size-4" aria-hidden="true"><!-- icono qr --></svg> CMP-AVZ-014
</div>
```

## 7. Config de Tailwind 4 (`@theme`)

```css
/* apps/web/src/styles/theme.css */
@import "tailwindcss";

@theme {
  --color-primary: var(--sire-primary);
  --color-primary-hover: var(--sire-primary-hover);
  --color-accent: var(--sire-accent);
  --color-success: var(--sire-success);
  --color-warning: var(--sire-warning);
  --color-danger: var(--sire-danger);
  --color-surface: var(--sire-surface);
  --color-surface-2: var(--sire-surface-2);
  --color-border: var(--sire-border);
  --color-ink: var(--sire-text);
  --color-ink-muted: var(--sire-text-muted);

  --radius-md: var(--sire-radius);
  --font-sans: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;

  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
}
/* Los tokens :root / [data-theme="dark"] del §2 se declaran en el CSS global e importan aquí. */
```

## 8. Reglas de aplicación

- El tema por defecto respeta `prefers-color-scheme`; el usuario puede alternarlo y la elección se persiste (`data-theme` en `<html>`).
- Un solo color de acento por pantalla; el estado se comunica con color **+** ícono **+** texto.
- Toda vista de datos define sus tres estados (vacío/carga/error).
- Mobile-first: la sidebar colapsa a drawer en `< md`; tablas se vuelven listas apiladas o con scroll horizontal controlado.

---

*Identidad Visual y Design System · Proyecto SiRe / Grupo OSC Plan Juárez · v1.0 · 2026-07-17*
