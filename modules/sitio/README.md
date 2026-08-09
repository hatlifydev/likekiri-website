# Módulo sitio — el front gestionado desde el admin

Editor de la estructura del sitio público: anuncio destacado, menú del
encabezado y enlaces del pie. Es la pieza de **server-driven UI** del
esqueleto: el admin edita, el core persiste, y el SSR aplica la estructura en
el siguiente render — sin desplegar nada.

## El circuito completo

```
admin (módulo sitio)                core                       likekiri.com
SitioPage ── PUT /api/admin/ ──► ShellConfigService ──┐
             shell-config         (Postgres, zod,     │ inyecta `site` en cada
             [shell.manage]        cache 30 s)        ▼ RenderRequest
                                                   SSR del shell
                                                   (header/footer/anuncio)
```

- La API es del core (`/api/admin/shell-config`, permiso de plataforma
  `shell.manage`) porque la estructura del shell es plataforma, no dominio de
  negocio. Este módulo solo aporta la pantalla.
- Si la config guardada no valida o la base no responde, el SSR usa los
  valores por defecto: el sitio nunca se cae por una config rota.
- Cache de 30 s en el core: los cambios se ven en ~medio minuto.

## Correr en desarrollo

```bash
pnpm --filter @likekiri/module-sitio build
MODULE_HMAC_KEY=<clave-32+> node modules/sitio/server.mjs   # puerto 4007
```
