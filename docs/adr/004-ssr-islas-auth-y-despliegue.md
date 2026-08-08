# ADR 004 — SSR de islas, decisiones de auth y despliegue

Fecha: 2026-08-09
Estado: aceptado

## SSR del shell con islas (Fase 3)

- El core carga el bundle SSR del web-shell (`dist/server/entry-server.js`,
  ESM) vía `import()` dinámico con ruta de config (`WEB_DIST_DIR`), no como
  dependencia de workspace: el core sigue sin conocer contenidos.
- Las islas NO se renderizan en servidor: el SSR emite un placeholder
  `data-likekiri-island` + `data-props` (JSON con `<`, `>`, `&`, U+2028/29
  escapados) y el runtime cliente (`islands.js`) las monta con
  `@module-federation/runtime`. Esto evita ejecutar código remoto dentro del
  proceso Node, que era el riesgo que la variante híbrida elimina.
- Catch-all en NestJS 11/Express 5: `@Get('{*path}')` (path-to-regexp v8).
  Orden de módulos en AppModule = orden de registro de rutas: Health → Auth →
  Shell (catch-all al final). Assets como middleware estático con prefijos
  distintos por superficie (`/assets` web, `/admin-assets` admin) para no
  colisionar.
- Páginas estáticas del shell viajan sin JavaScript (bootstrapModules solo
  cuando hay islas).
- Convención del core: **@Inject explícito en todo constructor con DI**. La
  inyección por tipo depende de emitDecoratorMetadata, que el runner de tests
  (tsx/esbuild) no emite; el token explícito funciona en tsc y en tsx.

## Auth (Fase 4)

- CSRF por validación de header Origin en métodos mutantes de /api (el brief
  permitía double-submit u Origin; Origin es más simple y suficiente con
  SameSite=Lax). Consecuencia: llamadas por curl a POSTs requieren -H Origin.
- Cookie de sesión `__Host-lk_session` (httpOnly, Secure, SameSite=Lax, Path=/),
  token opaco de 256 bits, solo su SHA-256 en la base.
- Superadmin es un rol comodín (clase AllPermissions): los permisos de módulos
  llegan dinámicamente por manifest y no pueden pre-sembrarse.
- Los estáticos federados de módulos se sirven bajo
  `https://likekiri.com/modules/<id>/` (handle_path de Caddy → puerto loopback
  del módulo) en lugar de un subdominio cdn.likekiri.com: evita tocar DNS y un
  certificado extra. CORS abierto (`*`) en esos estáticos: son JS público.

## Despliegue (Fase 7)

- `/srv/likekiri/app` = copia rsync del workspace (incluye node_modules de
  pnpm, symlinks relativos intactos); `/srv/likekiri/public` = assets cliente
  del web-shell servidos directo por Caddy.
- Config en `/etc/likekiri/`: `core.env` y `module-hello.env` (root:root 600,
  systemd los lee como root) y `modules.json` (likekiri:likekiri 600 — lo lee
  el proceso del core en runtime).
- Unidades: `likekiri-core.service` y `likekiri-module-hello.service`, usuario
  `likekiri` sin shell, endurecidas (NoNewPrivileges, ProtectSystem=strict,
  ProtectHome, PrivateTmp).
- Incidente documentado del reload de Caddy: `caddy validate` como root crea
  los archivos de log declarados y quedan root:root, y el proceso caddy no
  puede abrirlos → reload falla. Solución: chown caddy:caddy de los .log antes
  de recargar. El backup del Caddyfile quedó en
  `/etc/caddy/Caddyfile.bak.<fecha>`; el sitio preexistente
  (llmtrainer.likekiri.com) se verificó intacto tras la recarga.
- El seed (`pnpm --filter core seed:admin --email=…`) crea permisos base, rol
  superadmin, rol operador (sin permisos de módulo, útil para probar el
  filtrado) y una invitación de un solo uso.
