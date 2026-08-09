# Módulo clientes — el ejemplo de módulo con dominio propio

Registro y acceso de clientes en el sitio público, portal con plan contratado
y facturación, y su administración completa en el panel. **Todo el dominio
vive en este módulo**: sus pantallas, su API y su base de datos. El core no
sabe qué es un "cliente".

## Cómo habla el front con el admin (el patrón)

```
likekiri.com                        admin.likekiri.com
/clientes/registro ─┐               /clientes (Cuentas) ─┐
/clientes/acceso   ─┤ islas         /clientes/facturacion┤ páginas admin
/clientes/portal   ─┘   │                                │
                        ▼                                ▼
        /modules/clientes/api/...  (Caddy → 127.0.0.1:4006 en AMBOS orígenes)
                        │
              server.mjs del módulo
              ├─ SQLite propio (cuentas, sesiones, facturas)
              ├─ sesión de CLIENTE: cookie propia del módulo (__Host-lk_clientes)
              └─ sesión de ADMIN: delega la validación en el core
                 (reenvía la cookie a GET /api/auth/me y exige clientes.read/write)
```

Los dos frentes operan **los mismos datos** a través de la misma API del
módulo; cada superficie lleva su propia autenticación. El core solo aporta:
el registry (manifest firmado), el filtrado de menús por permisos, y la
introspección de la sesión admin.

## Superficies

| Superficie | Ruta | Componente | Quién la ve |
|---|---|---|---|
| web | `/clientes/registro` | RegistroIsland | público |
| web | `/clientes/acceso` | AccesoIsland | público |
| web | `/clientes/portal` | PortalIsland | público (la isla exige sesión de cliente) |
| admin | `/clientes` | CuentasAdminPage | `clientes.read` |
| admin | `/clientes/facturacion` | FacturacionAdminPage | `clientes.read` |

Menú admin: submenú **Clientes** (toggle) con Cuentas y Facturación.
Permisos declarados: `clientes.read`, `clientes.write` (las mutaciones de
admin exigen write; el superadmin tiene todo vía comodín).

## API del módulo (bajo /modules/clientes/api)

- `POST /registro` · `POST /acceso` · `POST /salir` · `GET /mi-cuenta` ·
  `POST /cambiar-plan` — sesión de cliente (cookie del módulo).
- `GET /admin/cuentas` · `GET /admin/facturas` ·
  `POST /admin/cuentas/:id/plan` · `POST /admin/cuentas/:id/estado` — sesión
  de admin del core.
- CSRF por validación de Origin en todos los POST; contraseñas con scrypt y
  sal única; tokens de sesión solo como SHA-256; planes y precios viven en el
  server (el cliente nunca fija un precio).

## Almacenamiento

SQLite embebido (`node:sqlite`, sin dependencias) en
`MODULE_DATA_DIR/clientes.sqlite` (producción: `/srv/likekiri/data`, con
`ReadWritePaths` en la unidad systemd). Un módulo real podría usar su propio
Postgres; el patrón no cambia: el almacenamiento es del módulo.

## Correr en desarrollo

```bash
pnpm --filter @likekiri/module-clientes build
MODULE_HMAC_KEY=<clave-32+> PUBLIC_ORIGIN=http://127.0.0.1:3000 node modules/clientes/server.mjs
```

Variables: `MODULE_PORT` (4006), `MODULE_HMAC_KEY`, `MODULE_REMOTE_ENTRY`,
`MODULE_PUBLIC_DIR`, `MODULE_DATA_DIR`, `CORE_INTERNAL_URL`,
`PUBLIC_ORIGIN`, `ADMIN_ORIGIN`.
