# likekiri

Plataforma modular de tipo **microkernel híbrido**: un core NestJS que no conoce
ningún dominio de negocio, y módulos independientes que se integran únicamente a
través de un manifest firmado. El core sirve dos superficies:

- **`likekiri.com`** — sitio público, shell React con SSR y "islas" de módulos.
- **`admin.likekiri.com`** — panel de administración, SPA CSR cuyo sidebar y
  páginas se construyen 100% desde los manifests de los módulos.

Este documento describe la arquitectura, el stack y cómo trabajar en el repo.
Para las reglas dirigidas a agentes de IA que trabajan en este código, ver
[`CLAUDE.md`](./CLAUDE.md). Para el detalle de cada decisión de diseño, ver
[`docs/adr/`](./docs/adr/).

## Índice

- [Arquitectura](#arquitectura)
- [Stack técnico](#stack-técnico)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Primeros pasos](#primeros-pasos)
- [Cómo crear un módulo nuevo](#cómo-crear-un-módulo-nuevo)
- [Seguridad](#seguridad)
- [Despliegue e infraestructura](#despliegue-e-infraestructura)
- [Decisiones de arquitectura (ADRs)](#decisiones-de-arquitectura-adrs)
- [Testing](#testing)
- [Convenciones de contribución](#convenciones-de-contribución)

## Arquitectura

### Principio rector

**El core nunca importa código de un módulo.** Solo consume el manifest JSON que
cada módulo publica (firmado con HMAC) y le hace peticiones HTTP. Esta regla es
verificable: `grep -rn "modules/" apps/core/src` debe devolver vacío. Si un
módulo se cae o se borra de la configuración, el resto de la plataforma sigue
funcionando.

```
                         ┌─────────────────────────┐
                         │          Caddy           │
                         │  (único punto de entrada  │
                         │   externo, TLS, proxy)    │
                         └───────────┬───────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 │                                        │
      likekiri.com / www              admin.likekiri.com  │  /modules/<id>/* (por host)
                 │                                        │
                 ▼                                        ▼
        ┌─────────────────────────────────────────────────────────┐
        │        apps/core — NestJS, escucha solo en 127.0.0.1     │
        │  registry · auth/sesiones · SSR del shell · shell-config │
        └───────────────────────────┬───────────────────────────┬─┘
                                     │ import() dinámico          │ fetch HTTP firmado HMAC
                                     ▼                             ▼
                         apps/web-shell (SSR + islas)     modules/<id> (proceso propio)
                         apps/admin-shell (SPA, sidebar    manifest + remoteEntry.js +
                         generado desde el manifest)       server.mjs + DB propia (opcional)
```

### Flujo de una petición al sitio público

1. Caddy reenvía la petición al core (`127.0.0.1:3000`), salvo los estáticos
   federados bajo `/modules/<id>/*`, que van directo al proceso del módulo.
2. El core resuelve la superficie por `Host` (`host-resolver.ts`): `likekiri.com`
   / `www` → `web`, `admin.likekiri.com` → `admin`, cualquier otro host → 404 sin
   fallback.
3. Para `web`, el core resuelve el path contra el **registry** de módulos
   (rutas + páginas propias del shell) y arma un `RenderRequest`.
4. El core carga dinámicamente (`import()` ESM, ya que el propio core es
   CommonJS) el bundle SSR de `apps/web-shell` (`dist/server/entry-server.js`) y
   hace streaming del HTML (`renderToPipeableStream`) directo a la response.
5. Si la ruta del módulo declara `ssr: "server"` (ADR 007), el core pide el HTML
   ya renderizado al propio módulo (`POST /render`, firmado, timeout de 400 ms)
   y lo incrusta con `data-hydrate="1"`. Si el módulo no responde a tiempo,
   degrada automáticamente a un placeholder de isla (`ssr: "shell"`).
6. En el cliente, `islands.ts` escanea los `[data-likekiri-island]`, inicializa
   Module Federation (React/ReactDOM compartidos como singleton) y monta o
   hidrata cada isla. Si una isla falla, solo se rompe su propio hueco.

### Flujo del panel de administración

El `admin-shell` es una SPA CSR sin pantallas de negocio propias (ADR 005): al
arrancar pide `GET /api/shell/manifest?surface=admin` y construye el sidebar
100% a partir de esa respuesta (entradas hoja o grupos `expanded`/`toggle`,
filtrados por los permisos de la sesión activa). Al navegar a una ruta de
módulo, `federation.ts` carga el componente remoto vía
`@module-federation/runtime` (`loadRemote`) y lo monta con los `:params` de la
URL como props. Sin sesión, el manifest de admin viene vacío.

### Registry de módulos (`apps/core/src/registry/registry.service.ts`)

- Lee `config/modules.json` (`{ moduleId, baseUrl, hmacKey }` por módulo, sin
  claves duplicadas ni compartidas).
- Cada `REGISTRY_REFRESH_MINUTES` (por defecto 5) sincroniza con todos los
  módulos: `GET /.well-known/module-manifest` firmado, verifica la firma de la
  respuesta y valida el manifest con `validateManifest` de `@likekiri/contract`.
- Si un módulo falla o publica un manifest inválido, el registry **conserva la
  última versión buena** en memoria (disponibilidad por encima de frescura).
- Compila tablas de rutas para `web` y `admin`; ante colisión de ruta, **gana el
  primer módulo en registrarla** y el manifest en conflicto se rechaza entero.
- Filtra rutas y menú por los permisos del usuario **en el servidor**, nunca en
  el cliente.

### Contrato módulo↔core (`packages/contract`)

Es el único paquete que comparten el core y todos los módulos. Define, con zod
estricto (`CONTRACT_VERSION = "1"`):

- `ModuleManifestSchema`: `moduleId`, `namespace`, `remoteEntry`, `exposes`,
  `routes`, `menu`, `permissions`.
- Reglas cruzadas (`validateManifest`): rutas y menú deben caer dentro del
  namespace del módulo; cada `component` debe estar en `exposes`; los permisos
  declarados deben empezar con `{namespace}.`; un módulo puede **exigir**
  permisos ajenos para controlar visibilidad sin necesidad de declararlos.
- `widget: true` en una ruta la convierte en isla flotante global, visible en
  todas las páginas del sitio (usado por el chat, ADR 008).
- Firma HMAC-SHA256 (`packages/contract/src/hmac.ts`): cada módulo tiene su
  propia clave, nunca compartida; ventana de validez de firma de 30 segundos;
  comparación con `timingSafeEqual`.

### UI dirigida por el servidor (server-driven UI)

Dos capas independientes deciden qué se ve en el sitio público:

1. El **registry** decide qué módulos y rutas existen.
2. `ShellSetting` en Postgres (editado desde el módulo `sitio`, ADR 006) decide
   la estructura del marco: anuncio, menú de encabezado, pie de página. Se cachea
   30 s y cae a valores por defecto si la base falla o el JSON es inválido.

## Stack técnico

| Área | Tecnología |
|---|---|
| Runtime | Node ≥22.13, pnpm 11.20.0 (workspaces puros — sin Turborepo ni Nx) |
| Lenguaje | TypeScript 5.9.3, `strict: true`, prohibido `any` para silenciar errores |
| Backend (core) | NestJS 11 + Express 5, `type: "commonjs"` con decoradores |
| Base de datos | PostgreSQL, vía Prisma 7 (`@prisma/adapter-pg`) — sin Redis ([ADR 003](./docs/adr/003-sin-redis.md)) |
| Auth | Sesiones opacas en Postgres (`argon2` para contraseñas), cookie `__Host-lk_session` |
| Validación | zod 4 (`z.strictObject`) en manifests, config y esquemas del contrato |
| Frontend (shells y módulos) | React 19 + Vite 8 |
| Federación de módulos | `@module-federation/vite` (build) y `@module-federation/runtime` (carga en cliente) |
| Testing | Test runner nativo de Node (`node:test` + `node:assert/strict`), ejecutado vía `tsx` — no se usa Jest ni Vitest |
| Estáticos multimedia | `sharp` (módulo `media`) |
| WebSockets | `ws` (módulo `chat`) |
| Almacenamiento propio de módulos | `node:sqlite` (`DatabaseSync`) cuando el módulo tiene dominio propio |
| Reverse proxy / TLS | Caddy (fuera del repo de la app; plantillas en `infra/caddy/`) |
| Proceso en producción | systemd nativo, sin Docker (Docker solo para Postgres en desarrollo) |

No hay ESLint, Prettier ni CI (`.github/workflows`) configurados actualmente en
el repo — es el estado real del proyecto, no una recomendación a resolver.

## Estructura del repositorio

```
apps/
  core/            NestJS: API, registry de módulos, auth/sesiones, SSR del shell
  web-shell/        Shell React del sitio público (SSR en el core + hidratación de islas)
  admin-shell/      SPA de admin: login, aceptar invitación, cargador de micro-frontends
modules/
  hello/            Módulo de ejemplo; valida el contrato de punta a punta
  cuentas/          Usuarios, invitaciones y contraseña (submenú "Cuentas")
  registry/         Vista de estado del registry de módulos (submenú "Plataforma")
  ejemplo-web/      Plantilla comentada para módulos de la superficie pública
  ejemplo-admin/    Plantilla comentada para módulos de la superficie admin
  clientes/         Dominio propio (API + SQLite): registro/portal de clientes,
                     cuentas/planes/facturación en el admin, SSR delegado
  sitio/            Server-driven UI del sitio (anuncio, menú, pie)
  media/            Gestor multimedia: subir, recortar, quitar fondo, servir WebP
  chat/             Chat en vivo por WebSocket (widget global + panel de agente)
  ops/              Admin-only: respaldo de base de datos y commit/push a git
packages/
  contract/         Esquemas zod + HMAC del contrato módulo↔core, CONTRACT_VERSION
  tokens/            Design tokens de marca compartidos (colores, tipografía, espaciados)
  i18n/              Strings ES/EN compartidos por ambos shells
infra/
  caddy/             Plantilla del Caddyfile (proxy + handle_path por módulo)
  systemd/           Una unit file por proceso (core + cada módulo desplegable)
  ops/               Script de acciones fijas para el módulo `ops` + regla sudoers
  docker-compose.yml  Solo Postgres para desarrollo local
docs/
  adr/               Decisiones de arquitectura (contexto, decisión, consecuencias)
  como-integrar-un-modulo.md  Guía paso a paso para crear e integrar un módulo
config/
  modules.example.json  Plantilla del registry real (config/modules.json, gitignored)
```

Cada módulo desplegable expone su manifest en `/.well-known/module-manifest`
firmado con su propia clave HMAC, y sirve su bundle federado (`remoteEntry.js` +
chunks) desde un `server.mjs` propio que escucha solo en `127.0.0.1`.

## Primeros pasos

### Requisitos

- Node ≥22.13
- pnpm 11.20.0 (`packageManager` fijado en el `package.json` raíz)
- PostgreSQL (local vía `infra/docker-compose.yml`, o una instancia propia)

### Instalación

```bash
pnpm install
```

### Configuración

```bash
cp .env.example .env                              # config del core (apps/core)
cp config/modules.example.json config/modules.json # registry de módulos, con sus claves HMAC
```

Variables relevantes en `.env`: `DATABASE_URL`, `PORT` (3000 por defecto),
`SESSION_SECRET` (generar con `openssl rand -base64 48`), `INVITE_TTL_HOURS`,
`SESSION_TTL_HOURS`, `MODULE_REGISTRY_CONFIG` (ruta a `config/modules.json`),
`ALLOWED_REMOTE_ORIGINS`, `REGISTRY_REFRESH_MINUTES`, `PUBLIC_BASE_URL`,
`ADMIN_BASE_URL`. Cada módulo, además, espera sus propias variables en
producción (puerto, clave HMAC, URL del `remoteEntry`) vía `EnvironmentFile` de
systemd.

### Levantar Postgres local

```bash
docker compose -f infra/docker-compose.yml up -d
```

### Comandos del workspace

```bash
pnpm build       # build recursivo de todos los workspaces
pnpm test        # tests recursivos
pnpm typecheck   # typecheck recursivo
```

### Desarrollo

```bash
pnpm --filter core dev              # core en modo watch (tsx watch)
pnpm --filter core seed:admin       # crea el primer usuario superadmin
pnpm --filter admin-shell dev       # SPA de admin (Vite dev server)
```

El `web-shell` no tiene servidor de desarrollo propio: su SSR se sirve a través
del core, que carga el bundle construido con `pnpm --filter web-shell build`.

Para levantar un módulo localmente, dentro de `modules/<id>`:

```bash
pnpm build   # build federado (vite build)
pnpm serve   # server.mjs: manifest + estáticos federados
```

## Cómo crear un módulo nuevo

Ver la guía completa en
[`docs/como-integrar-un-modulo.md`](./docs/como-integrar-un-modulo.md). En
resumen:

1. Crear el paquete en `modules/<id>/` (`package.json`, `vite.config.ts` con
   `@module-federation/vite`, `server.mjs`, `src/index.ts` y componentes).
2. Publicar el manifest en `GET /.well-known/module-manifest`, firmado con una
   clave HMAC propia, validado contra `ModuleManifestSchema` de
   `packages/contract`.
3. Declarar rutas/menú dentro del namespace del módulo; permisos propios
   siempre con prefijo `{namespace}.`.
4. Dar de alta el módulo en `config/modules.json` (clave HMAC + `baseUrl`), en
   `ALLOWED_REMOTE_ORIGINS`, en Caddy (`handle_path /modules/<id>/*`) y crear su
   unit de systemd.
5. Verificar la "prueba de fuego": quitar el módulo de `modules.json`, reiniciar
   el core y confirmar que el resto de la plataforma sigue funcionando.

## Seguridad

- **Tokens en texto plano, nunca en base ni en logs.** Las sesiones usan un
  token opaco de 256 bits; solo se guarda `sha256Hex(token)`. Las invitaciones
  siguen el mismo patrón, con TTL configurable y mensajes de error genéricos
  (no revelan si el token existe, expiró o ya fue usado).
- **Cookie de sesión** `__Host-lk_session` (httpOnly, Secure, SameSite=Lax).
- **CSRF** por validación del header `Origin` en métodos mutantes de `/api`, no
  por double-submit token.
- **Rate limiting y mitigación de timing attacks** en login: ventana deslizante
  por IP, hash "de sacrificio" cuando el email no existe (para que el tiempo de
  respuesta no filtre si una cuenta existe), bloqueo exponencial tras 5 fallos.
- **HMAC por módulo**, nunca compartida entre módulos — si se compromete una
  clave, no compromete a los demás. Ventana de validez de firma de 30 s.
- **El core escucha solo en `127.0.0.1:3000`**; Caddy es el único punto de
  entrada externo ([ADR 001](./docs/adr/001-caddy.md)).
- **Permisos evaluados en el servidor**: `SessionGuard` + `PermissionsGuard`
  (`@RequirePermissions`), nunca confiando en lo que el cliente diga.

## Despliegue e infraestructura

- **Sin Docker en producción.** El `docker-compose.yml` del repo es solo para
  levantar Postgres en desarrollo local; en el VPS, Postgres y el resto de
  dependencias se instalan nativas vía `apt` ([ADR 002](./docs/adr/002-stack-y-versiones.md),
  [ADR 003](./docs/adr/003-sin-redis.md)).
- **systemd**: una unit file por proceso (`likekiri-core.service` + una
  `likekiri-module-<id>.service` por módulo desplegable), corriendo como el
  usuario dedicado `likekiri` sin shell, con hardening (`NoNewPrivileges`,
  `ProtectSystem=strict`, `ProtectHome`, `PrivateTmp`).
- **Caddy** hace de reverse proxy: todo lo que no sea un estático federado va al
  core (`127.0.0.1:3000`); cada módulo con superficie propia se expone bajo
  `/modules/<id>/*` vía `handle_path` hacia su puerto (ver
  `infra/caddy/likekiri.caddy`). El Caddyfile de producción es **compartido con
  un sitio ya en producción** (`llmtrainer.likekiri.com`): cualquier cambio
  exige backup fechado y `caddy validate` antes de recargar — regla también
  descrita en [`CLAUDE.md`](./CLAUDE.md).
- **Cache de estáticos federados**: los `server.mjs` de los módulos sirven todos
  sus chunks con `Cache-Control: no-cache` (no solo `remoteEntry.js`), para
  evitar que el navegador sirva chunks de una build anterior cuyo nombre se
  reutilizó tras un deploy. Cada build limpia su `outDir` (`emptyOutDir: true`).
- **Módulo `ops`** (admin-only): respaldo de la base con `pg_dump -Fc`
  (retención de 20 backups) y commit/push a git desde el propio panel de admin,
  ejecutado por un script root de acciones fijas (`infra/ops/likekiri-ops`) vía
  sudo restringido — el servicio del módulo nunca corre shell arbitrario ni como
  root ([ADR 009](./docs/adr/009-modulo-ops.md)).

## Decisiones de arquitectura (ADRs)

| ADR | Decisión |
|---|---|
| [001 — Integración con Caddy existente](./docs/adr/001-caddy.md) | Core en `127.0.0.1:3000`; Caddy se extiende sin `import`, siempre con backup + `caddy validate` |
| [002 — Stack, versiones y tooling](./docs/adr/002-stack-y-versiones.md) | Node 22, pnpm 11.20.0, TS 5.9.3, NestJS 11 + Express 5, Vite 8 + React 19, zod 4, Prisma 7 |
| [003 — Sin Redis](./docs/adr/003-sin-redis.md) | Sesiones en Postgres; cache del registry en memoria del proceso del core |
| [004 — SSR de islas, auth y despliegue](./docs/adr/004-ssr-islas-auth-y-despliegue.md) | Carga dinámica del bundle SSR; placeholder `data-likekiri-island`; CSRF por `Origin`; deploy vía rsync + systemd |
| [005 — Admin por módulos y submenús](./docs/adr/005-admin-por-modulos-y-submenus.md) | El admin-shell queda sin pantallas de negocio; sidebar 100% desde el manifest; contrato añade grupos de menú |
| [006 — Server-driven shell y tipo de cuenta](./docs/adr/006-server-driven-shell-y-tipo-de-cuenta.md) | `ShellSetting` en Postgres para anuncio/menú/pie del sitio; login único de clientes con atributo `tipo` |
| [007 — SSR delegado al módulo](./docs/adr/007-ssr-delegado-al-modulo.md) | Modo de ruta `ssr: "server"`: el módulo renderiza su propio HTML (firmado, timeout 400 ms), con degradación automática |
| [008 — Chat por WebSocket y widgets globales](./docs/adr/008-chat-websocket-y-widgets-globales.md) | `widget: true` para islas flotantes globales; módulo `chat` con WebSocket y SQLite propios |
| [009 — Módulo ops](./docs/adr/009-modulo-ops.md) | Respaldo de BD y commit/push a git desde el admin, vía script root restringido por sudo |

## Testing

No se usa Jest ni Vitest: los tests corren sobre el **test runner nativo de
Node** (`node:test` + `node:assert/strict`), vía `tsx`:

```bash
pnpm test                              # recursivo, todos los workspaces
pnpm --filter core test                # solo apps/core/test/*.test.ts
pnpm --filter @likekiri/contract test  # solo packages/contract/test/*.test.ts
```

Cobertura actual: `apps/core` (auth, health, registry, shell) y
`packages/contract` (contrato, HMAC). Los shells (`web-shell`, `admin-shell`),
`packages/tokens`, `packages/i18n` y los módulos en `modules/` no tienen tests
todavía — estado real del proyecto.

## Convenciones de contribución

- Commits pequeños y atómicos, mensaje en imperativo en español.
- Decisiones no triviales se documentan como un nuevo ADR en `docs/adr/`
  (contexto, decisión, consecuencias).
- Versiones de librerías se verifican con `npm view <pkg> version` antes de
  fijarlas.
- Trabajo por fases: al terminar una fase, mostrar qué se construyó y cómo
  verificarlo, y esperar confirmación antes de seguir.
- Reglas técnicas inquebrantables (el core nunca importa un módulo, TypeScript
  estricto sin `any`, tokens nunca en texto plano, una clave HMAC por módulo,
  cuidado con el Caddyfile compartido) están detalladas para agentes de IA en
  [`CLAUDE.md`](./CLAUDE.md).
