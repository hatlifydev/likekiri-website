# ADR 006 — Server-driven shell (el front gestionado desde el admin) y tipo de cuenta

Fecha: 2026-08-09
Estado: aceptado

## Contexto

El usuario pidió (1) que el login de clientes sea visible y único, con un
diferenciador persona/empresa que se manifieste en el front, y (2) que el
front pueda gestionarse, organizarse y modificarse desde el admin — es decir,
que el back administre cómo se hace el SSR del front, igual que ya administra
las rutas de módulos vía registry.

## Decisión

### 1. Configuración server-driven del shell web

- Nueva tabla genérica `ShellSetting (key, value Json)` en Postgres. El core
  no interpreta dominios: guarda estructura del shell (anuncio, enlaces de
  header y pie), validada con zod estricto (`WebShellConfigSchema`).
- `ShellConfigService` (core): lee con cache de 30 s y **fallback a defaults
  ante base caída o JSON inválido** — el sitio nunca se cae por una config
  rota. Escritura solo vía `PUT /api/admin/shell-config` con el permiso de
  plataforma `shell.manage` (+ audit log).
- El SSR inyecta la config en cada `RenderRequest` (`site`); el web-shell
  pinta header, pie y franja de anuncio desde ahí, con defaults embebidos como
  paracaídas.
- La pantalla de edición es un módulo más (**`modules/sitio`**, puerto 4007):
  entrada "Sitio web" del sidebar, consume `shell.manage`. El módulo aporta la
  UI; la API y la persistencia son plataforma.
- Circuito verificado en producción: fila en `ShellSetting` → siguiente render
  muestra anuncio y menú modificados; sin fila → defaults.

### 2. Login único con tipo de cuenta (módulo clientes)

- Un solo formulario de acceso. El **tipo** (`persona` | `empresa`) es un
  atributo de la cuenta, elegido al registrarse; columna `tipo` añadida por
  migración aditiva en el SQLite del módulo (default `persona`).
- Manifestación en el front: el registro sugiere planes según el tipo
  (persona → Gratis/Profesional; empresa → Profesional/Empresa), el portal
  muestra el tipo, y el admin lo lista con su chip. El server acepta cualquier
  plan del catálogo: la sugerencia es UX, no autorización.
- El default del menú del sitio incluye "Iniciar sesión" → /clientes/acceso
  (editable desde el módulo sitio, como todo el menú).

## Consecuencias

- El front tiene ahora DOS niveles server-driven: el registry decide qué rutas
  y módulos existen; la shell-config decide la estructura del marco (menú,
  anuncio, pie). Ambos se administran sin desplegar.
- Los cambios de config tardan hasta 30 s en verse (cache). Si se quisiera
  inmediatez, el PUT podría notificar al proceso; no vale la complejidad hoy.
- `shell.manage` se añadió a los permisos base del seed y a la base de
  producción; el superadmin lo tiene vía comodín.
- La config valida largo y cantidad de enlaces (máx. 8 por zona) para que un
  error de tipeo no deforme el sitio.
