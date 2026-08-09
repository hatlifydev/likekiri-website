# ADR 005 — El admin se compone de módulos; submenús en el contrato

Fecha: 2026-08-09
Estado: aceptado

## Contexto

La primera versión del panel traía las pantallas de cuentas (usuarios,
invitaciones, contraseña) y la vista del registry codificadas dentro del shell
de admin, con el menú en la raíz junto a las entradas de módulos. Eso
contradice el principio del esqueleto: cada parte del admin debe ser un módulo
independiente que se integra por manifest, y un módulo debe poder registrar
menús Y submenús.

## Decisión

### 1. El shell de admin no tiene pantallas de negocio

`apps/admin-shell` queda reducido a: login, aceptar invitación, layout y el
cargador de micro-frontends. **El sidebar se construye 100% desde
`GET /api/shell/manifest?surface=admin`**; si un módulo no está en el registry,
su menú y sus rutas no existen. La ruta raíz navega al primer destino visible
del menú.

Las pantallas se movieron a dos módulos nuevos, hermanos de `hello`:

- **`modules/cuentas`** (puerto 4002): `/cuentas/usuarios`,
  `/cuentas/invitaciones`, `/cuentas/password`. Registra el submenú "Cuentas"
  en `mode: "expanded"`.
- **`modules/registry`** (puerto 4003): `/registry`. Registra el submenú
  "Plataforma" en `mode: "toggle"` (plegable) y declara `registry.read`.

### 2. Contrato v0.2: submenús

`MenuEntry` admite dos formas, excluyentes y validadas:

- **hoja**: `path` (enlace directo), sin `children` ni `mode`.
- **grupo**: `children` (lista de `{label, path, icon?, order}`) + `mode`
  opcional: `"expanded"` (siempre abierto, por defecto) o `"toggle"`
  (plegable). Sin `path` propio.

Los paths de los hijos deben vivir dentro del namespace del módulo. El core
filtra cada hijo por permisos (visible solo si apunta a una ruta visible) y
oculta el grupo entero si queda vacío. Cambio aditivo: `contractVersion` sigue
en `1`; el paquete sube a 0.2.0.

### 3. Permisos: declarar ≠ consumir

Un módulo solo puede **declarar** permisos de su namespace (regla intacta),
pero sus rutas pueden **consumir** (exigir para visibilidad) permisos de la
plataforma u otros namespaces — p. ej. `cuentas` exige `users.read` sin
declararlo. Consumir solo restringe visibilidad, nunca amplía capacidades: la
autorización real siguen siendo los guards del core sobre `/api/*`.

### 4. La superficie admin es privada

`GET /api/shell/manifest?surface=admin` sin sesión devuelve rutas y menú
vacíos: la estructura del panel no se revela a anónimos. La superficie web no
cambia.

## Consecuencias

- Probar el desacoplamiento ahora aplica a TODO el admin: quitar `cuentas` de
  la config deja un panel sin gestión de usuarios, pero sano.
- Los estáticos federados de módulos de admin se sirven por el mismo origen
  (`https://admin.likekiri.com/modules/<id>/` vía handle_path de Caddy), sin
  CORS. Los de web siguen en `https://likekiri.com/modules/<id>/`.
- Cada módulo nuevo del admin repite la receta: build federado + server de
  manifest firmado + clave HMAC propia + unidad systemd + handle_path en Caddy.
- Las pantallas de módulos usan las clases CSS del shell (panel, chip, boton…)
  además de los design tokens; ese acoplamiento estético está asumido y
  documentado en los README de los módulos.
