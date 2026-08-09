# Módulo registry

Vista de plataforma: estado del registry de módulos (versión, última
sincronización, errores del último pull). Es un módulo independiente — el
shell del admin lo descubre por manifest, como a cualquier otro.

## Qué demuestra este módulo

- **Submenú en `mode: "toggle"`**: la entrada `Plataforma` del sidebar es un
  grupo plegable registrado desde el manifest.
- **Permiso declarado en su namespace**: `registry.read` (namespace
  `registry`), que además coincide con el permiso base que la plataforma
  siembra — el rol superadmin lo tiene vía comodín.
- Consume la API del core `/api/admin/registry`; la autorización real vive en
  el servidor.

## Correr en desarrollo

```bash
pnpm --filter @likekiri/module-registry build
MODULE_HMAC_KEY=<clave-32+-chars> node modules/registry/server.mjs   # puerto 4003
```

Variables: `MODULE_PORT` (4003), `MODULE_HMAC_KEY` (obligatoria),
`MODULE_REMOTE_ENTRY` (URL pública de remoteEntry.js), `MODULE_PUBLIC_DIR`.
