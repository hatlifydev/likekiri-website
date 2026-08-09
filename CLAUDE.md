# likekiri — guía para agentes

Plataforma modular (microkernel híbrido): core NestJS que no conoce ningún dominio
de negocio, módulos independientes que publican manifest + bundle federado,
`likekiri.com` (shell SSR + islas) y `admin.likekiri.com` (SPA CSR).
La especificación completa vive en el brief del proyecto; las decisiones en `docs/adr/`.

## Reglas inquebrantables

- **El core nunca importa un módulo.** `grep -rn "modules/" apps/core/src` debe
  devolver vacío. Los módulos entran solo por manifest validado.
- `packages/contract` es el contrato módulo↔core. Todo cambio incompatible sube
  la major y `CONTRACT_VERSION`.
- TypeScript estricto; prohibido `any` para silenciar el compilador.
- Tokens (sesión, invitación) jamás en texto plano en base, logs o localStorage.
- Cada módulo tiene su propia clave HMAC; jamás un secreto compartido.
- El core escucha solo en `127.0.0.1` (puerto 3000, ver ADR 001).
- Caddy en el VPS: backup + `caddy validate` antes de cualquier reload; el
  Caddyfile comparte archivo con un sitio en producción (`llmtrainer.likekiri.com`).
- Trabajo por fases: al terminar una fase, mostrar qué se construyó y cómo
  verificarlo, y esperar confirmación.

## Layout

- `apps/core` — NestJS: API, registry, auth, SSR del shell. CommonJS, decoradores.
- `apps/web-shell` — React shell del website público (SSR en core + hidratación).
- `apps/admin-shell` — shell de la SPA de admin: login, aceptar invitación y
  cargador de micro-frontends. SIN pantallas de negocio: el sidebar se
  construye 100% desde el manifest (ADR 005).
- `modules/hello` — módulo de ejemplo que valida el contrato de punta a punta.
- `modules/cuentas` — usuarios, invitaciones y contraseña (submenú "Cuentas").
- `modules/registry` — vista del registry (submenú "Plataforma", modo toggle).
- `modules/ejemplo-web` / `modules/ejemplo-admin` — PLANTILLAS comentadas para
  crear módulos nuevos (una por superficie); parte de la guía de integración.
- `modules/clientes` — módulo con DOMINIO PROPIO (API + SQLite): registro y
  portal de clientes en el front (tipo persona/empresa, login único),
  cuentas/planes/facturación en el admin.
- `modules/sitio` — server-driven UI: edita la estructura del sitio público
  (anuncio, menú, pie) que el core inyecta en cada render del SSR (ADR 006).
- `modules/media` — gestor multimedia (subir, recortar, transparentar, WebP).
- `modules/chat` — chat en vivo por WebSocket (widget global + panel de agente).
- `packages/contract` — esquemas zod + tipos del manifest, `CONTRACT_VERSION`.
- `packages/tokens` — design tokens compartidos.
- `infra/` — plantillas de Caddy, systemd y docker-compose (dev).

## Comandos

- `pnpm install` — instala todo el workspace (Node ≥22.13, pnpm 11).
- `pnpm build` / `pnpm test` / `pnpm typecheck` — recursivos sobre el workspace.
- `pnpm --filter core dev` — core en modo watch.

## Documentación clave

- `docs/como-integrar-un-modulo.md` — guía paso a paso para crear un módulo e
  integrarlo al admin (páginas + submenús) y al frontend público (islas SSR).
- `docs/adr/` — decisiones con contexto y consecuencias.

## Convenciones

- Commits pequeños y atómicos, mensaje en imperativo en español.
- Decisiones no triviales → `docs/adr/NNN-titulo.md` (contexto, decisión, consecuencias).
- Versiones de librerías: verificar con `npm view <pkg> version` antes de fijar.
