# Módulo hello

Módulo de ejemplo de likekiri. Existe para una sola cosa: demostrar que el
contrato módulo↔core funciona de punta a punta sin que el core sepa nada de él.
Úsalo como plantilla para tu propio módulo.

## Qué hace un módulo

1. Expone componentes React vía Module Federation (`remoteEntry.js`).
2. Publica un manifest en `/.well-known/module-manifest` firmado con su clave
   HMAC propia, describiendo rutas, menú y permisos (ver `@likekiri/contract`).
3. Todas sus rutas viven bajo `/{namespace}/` y todos sus permisos empiezan con
   `{namespace}.` — el core rechaza cualquier cosa fuera de tu namespace.

## Estado

- [x] Componentes `HelloIsland` (web, isla hidratada) y `HelloAdminPage` (admin).
- [ ] Fase 6: build federado con `@module-federation/vite` + manifest servido
      con firma HMAC.

## Comandos

- `pnpm --filter @likekiri/module-hello build`
- `pnpm --filter @likekiri/module-hello typecheck`
