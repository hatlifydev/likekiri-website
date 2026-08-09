# Módulo ejemplo-admin — plantilla de la superficie de administración

Ejemplo mínimo y comentado de un módulo para **admin.likekiri.com**: dos
páginas bajo un submenú plegable. Copia este módulo para arrancar el tuyo.
La guía completa está en `docs/como-integrar-un-modulo.md`.

## Qué demuestra

- **Submenú registrado por manifest**: la entrada "Ejemplo" del sidebar es un
  grupo `mode: "toggle"` con dos hijos (Panel y Ajustes). El shell no sabe
  nada de este módulo: pinta lo que el manifest declara, ya filtrado por
  permisos en el servidor.
- **Permiso declarado en el propio namespace**: `ejemplo-admin.read`. El
  superadmin lo tiene vía comodín; un rol sin él no ve ni el menú ni las
  rutas (pruébalo con el rol "operador").
- **Llamadas a la API del core** por el mismo origen (`/api/health` en
  PanelPage) y **estado propio del módulo** (AjustesPage).
- Dos páginas expuestas desde un mismo remoteEntry (`./PanelPage`,
  `./AjustesPage`).

## Correr en desarrollo

```bash
pnpm --filter @likekiri/module-ejemplo-admin build
MODULE_HMAC_KEY=<clave-32+-chars> node modules/ejemplo-admin/server.mjs   # puerto 4005
```

Variables: `MODULE_PORT` (4005), `MODULE_HMAC_KEY` (obligatoria),
`MODULE_REMOTE_ENTRY`, `MODULE_PUBLIC_DIR`.

## Checklist al clonar esta plantilla

- [ ] Cambia `name` en `vite.config.ts`, `MODULE_ID` en `server.mjs` y el
      manifest (moduleId, namespace, exposes, rutas, menú, permisos).
- [ ] Pide clave HMAC propia + alta en `modules.json` + tu origen en
      `ALLOWED_REMOTE_ORIGINS` + `handle_path` en Caddy (bloque de admin) +
      unidad systemd.
- [ ] Prueba de fuego: quita el módulo de la config del core y reinicia; el
      panel debe seguir sano, sin tu menú y sin tus rutas.
