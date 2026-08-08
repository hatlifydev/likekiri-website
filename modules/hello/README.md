# Módulo hello

Módulo de ejemplo de likekiri. Existe para una sola cosa: demostrar que el
contrato módulo↔core funciona de punta a punta sin que el core sepa nada de él.
Úsalo como plantilla para tu propio módulo.

## Anatomía de un módulo

1. **Componentes React federados** (`vite.config.ts` + `@module-federation/vite`):
   el build produce `dist/remoteEntry.js`, que expone `./HelloIsland` y
   `./HelloAdminPage`. Los shells los cargan en runtime; el core jamás importa
   este código.
2. **Manifest firmado** (`server.mjs`): un servidor mínimo publica
   `/.well-known/module-manifest`. El core hace pull firmando la petición con
   la clave HMAC de ESTE módulo (nunca compartida); el servidor la verifica y
   firma su respuesta. Ver `@likekiri/contract/hmac`.
3. **Namespace**: todas las rutas viven bajo `/hello` y todos los permisos
   empiezan con `hello.` — cualquier cosa fuera del namespace hace que el core
   rechace el manifest completo, con log del motivo.

## Superficies

- `web /hello/:slug` — isla: el core hace SSR del layout y emite un placeholder
  con las props serializadas; el navegador carga `remoteEntry.js` e hidrata.
- `admin /hello` — página de la SPA de admin, visible solo con `hello.read`.
  La entrada de menú la aporta el manifest (slot `sidebar`).

## Correr en desarrollo

```bash
pnpm --filter @likekiri/module-hello build
HELLO_HMAC_KEY=<clave-de-32+-chars> node modules/hello/server.mjs
# y en config/modules.json del core:
# { "modules": [{ "moduleId": "hello", "baseUrl": "http://127.0.0.1:4001", "hmacKey": "<la-misma>" }] }
```

Variables: `HELLO_PORT` (4001), `HELLO_HMAC_KEY` (obligatoria),
`HELLO_REMOTE_ENTRY` (URL pública de remoteEntry.js), `HELLO_PUBLIC_DIR`.

## Checklist para tu propio módulo

- [ ] Cambia `name` en `vite.config.ts` y los `exposes`.
- [ ] Ajusta `moduleId`, `namespace`, rutas, menú y permisos en tu manifest.
- [ ] Pide al operador del core: tu clave HMAC propia + alta en la config del
      registry + tu origen en `ALLOWED_REMOTE_ORIGINS`.
- [ ] Prueba de fuego: quita tu módulo de la config del core y reinícialo.
      Si algo del core se rompe, tu módulo está mal acoplado.
