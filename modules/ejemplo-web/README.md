# Módulo ejemplo-web — plantilla de la superficie pública

Ejemplo mínimo y comentado de un módulo para **likekiri.com**: una isla
interactiva (simulador de horas recuperadas) servida en `/ejemplo-web/:modo`.
Copia este módulo para arrancar el tuyo. La guía completa está en
`docs/como-integrar-un-modulo.md`.

## Qué demuestra

- **El patrón isla completo**: el core hace SSR del layout y los metadatos y
  emite un placeholder; el navegador carga `remoteEntry.js` (Module Federation,
  ESM) y monta `SimuladorIsland` con las props de la ruta.
  Verifícalo sin ejecutar JS: `curl -s https://likekiri.com/ejemplo-web/demo`
  devuelve el HTML del layout con el placeholder dentro.
- **Props desde la URL**: `/ejemplo-web/:modo` → `{ modo: "demo" }`.
- **Interactividad solo-cliente**: los sliders funcionan tras la hidratación;
  el servidor jamás ejecuta este código.
- **Un módulo web no registra menú**: el header del sitio público es estático;
  `menu: []`.

## Correr en desarrollo

```bash
pnpm --filter @likekiri/module-ejemplo-web build
MODULE_HMAC_KEY=<clave-32+-chars> node modules/ejemplo-web/server.mjs   # puerto 4004
```

Variables: `MODULE_PORT` (4004), `MODULE_HMAC_KEY` (obligatoria),
`MODULE_REMOTE_ENTRY`, `MODULE_PUBLIC_DIR`.

## Checklist al clonar esta plantilla

- [ ] Cambia `name` en `vite.config.ts`, `MODULE_ID` en `server.mjs` y el
      manifest (moduleId, namespace, exposes, rutas).
- [ ] Pide clave HMAC propia + alta en `modules.json` + tu origen en
      `ALLOWED_REMOTE_ORIGINS` + `handle_path` en Caddy + unidad systemd.
- [ ] Prueba de fuego: quita el módulo de la config del core y reinicia; el
      sitio debe seguir sano y tu ruta devolver 404.
