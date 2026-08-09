# Módulo cuentas

Gestión de cuentas del panel de administración: usuarios, invitaciones y
contraseña propia. Es un módulo independiente del esqueleto: el shell del admin
no sabe que existe; lo descubre por el manifest.

## Qué demuestra este módulo (además de funcionar)

- **Submenú registrado por manifest**: la entrada `Cuentas` del sidebar es un
  grupo con `children` (Usuarios, Invitaciones, Mi contraseña) en
  `mode: "toggle"`. El core filtra cada hijo por permisos y oculta el grupo
  si queda vacío.
- **Permisos consumidos vs declarados**: este módulo no declara permisos
  propios; sus rutas *consumen* permisos de la plataforma (`users.read`).
  Consumir solo restringe visibilidad — declarar fuera del namespace sigue
  prohibido.
- Sus pantallas hablan con las APIs del core (`/api/admin/*`, `/api/auth/*`)
  por el mismo origen; la autorización real vive en el servidor, el menú solo
  refleja lo que la sesión puede ver.

## Rutas

| Superficie | Ruta | Componente | Visibilidad |
|---|---|---|---|
| admin | `/cuentas/usuarios` | `./UsersPage` | `users.read` |
| admin | `/cuentas/invitaciones` | `./InvitationsPage` | `users.read` |
| admin | `/cuentas/password` | `./PasswordPage` | cualquier sesión |

## Correr en desarrollo

```bash
pnpm --filter @likekiri/module-cuentas build
MODULE_HMAC_KEY=<clave-32+-chars> node modules/cuentas/server.mjs   # puerto 4002
```

Variables: `MODULE_PORT` (4002), `MODULE_HMAC_KEY` (obligatoria),
`MODULE_REMOTE_ENTRY` (URL pública de remoteEntry.js), `MODULE_PUBLIC_DIR`.
