# Cómo integrar un módulo en likekiri

Guía para equipos que construyen módulos. Un módulo es un paquete independiente
que se integra a la plataforma **solo** mediante su manifest: el core jamás
importa tu código, y si tu módulo desaparece, el sitio y el panel siguen sanos.
Plantillas para copiar: **`modules/ejemplo-web`** (superficie pública, isla
interactiva) y **`modules/ejemplo-admin`** (superficie admin, submenú toggle +
permiso propio). Otros ejemplos vivos: `modules/hello` (web + admin),
`modules/cuentas` (admin con permisos consumidos), `modules/registry` (admin).

Hay dos superficies y puedes usar una o ambas desde el mismo módulo:

- **`web`** (likekiri.com): tu componente se sirve como **isla** — el core hace
  SSR del layout y emite un placeholder; el navegador carga tu bundle federado
  y lo monta. Tu código nunca corre en el servidor del core.
- **`admin`** (admin.likekiri.com): tu componente es una **página de la SPA**,
  cargada por Module Federation cuando el usuario navega a tu ruta. El menú y
  el submenú que declares aparecen solos, filtrados por permisos.

## Reglas que el core te va a imponer (y por qué)

1. **Namespace**: todas tus rutas viven en `/{namespace}` o `/{namespace}/...`
   y todos los permisos que DECLARES empiezan con `{namespace}.`. Un manifest
   que reclame `/checkout` o declare `users.superpoder` se rechaza entero, con
   log del motivo.
2. **Declarar ≠ consumir permisos**: solo declaras permisos de tu namespace,
   pero tus rutas pueden *exigir* permisos ajenos (p. ej. `users.read`) para
   visibilidad. Exigir solo restringe — la autorización real son los guards del
   core sobre `/api/*`.
3. **Manifest estricto**: campos desconocidos = rechazo (zod `.strict()`).
   `contractVersion` es obligatorio (hoy `"1"`).
4. **Colisiones**: si tu ruta choca con una ya registrada, gana el primero en
   registrarse y tú fallas ruidosamente (lo verás en la vista Registry y en el
   log del core).
5. **Clave HMAC propia**: el core firma su petición de manifest y tú la
   verificas; tú firmas tu respuesta y el core la verifica. Nunca se comparte
   una clave entre módulos. Helpers listos en `@likekiri/contract/hmac`.

## Paso a paso (común a ambas superficies)

### 1. Crea el paquete

```
modules/<tu-modulo>/
├── package.json        # deps: react, react-dom, @likekiri/contract (workspace:*)
├── tsconfig.json       # copia el de modules/cuentas
├── vite.config.ts      # federación (abajo)
├── server.mjs          # manifest firmado + estáticos (copia y adapta el de cuentas)
└── src/
    ├── index.ts        # re-exporta tus componentes (entrada nominal del build)
    └── MiPagina.tsx
```

### 2. Build federado (`vite.config.ts`)

```ts
import { federation } from '@module-federation/vite';

federation({
  name: 'tu-modulo',              // = moduleId; el shell carga "tu-modulo/MiPagina"
  filename: 'remoteEntry.js',
  exposes: { './MiPagina': './src/MiPagina.tsx' },
  shared: { react: { singleton: true }, 'react-dom': { singleton: true } },
})
```

El nombre expuesto (sin `./`) debe coincidir con el **nombre del export** del
archivo: `exposes['./MiPagina']` → `export function MiPagina(...)`. Los shells
buscan `mod['MiPagina'] ?? mod.default`.

### 3. El manifest

Lo publicas en `GET /.well-known/module-manifest`, firmado. Esquema completo y
validación en `packages/contract` (`ModuleManifestSchema`, `validateManifest`).

```jsonc
{
  "contractVersion": "1",
  "moduleId": "tu-modulo",
  "name": "Tu Módulo",
  "version": "0.1.0",
  "namespace": "tu-modulo",
  "remoteEntry": "https://…/modules/tu-modulo/remoteEntry.js",
  "exposes": ["./MiPagina"],
  "routes": [ /* ver superficie web / admin abajo */ ],
  "menu":   [ /* hoja o submenú, abajo */ ],
  "permissions": [ { "key": "tu-modulo.leer", "label": "Ver Tu Módulo" } ]
}
```

### 4. El servidor del módulo

Copia `modules/cuentas/server.mjs` y adapta `MODULE_ID` y el manifest. Hace
tres cosas: verifica la firma HMAC de la petición del core, responde el
manifest firmado, y sirve `dist/` con CORS abierto (tu JS es público) y
`no-cache` en `remoteEntry.js`. Escucha **solo en 127.0.0.1**.

Variables: `MODULE_PORT`, `MODULE_HMAC_KEY` (≥32 chars), `MODULE_REMOTE_ENTRY`
(la URL pública), `MODULE_PUBLIC_DIR`.

### 5. Alta en la plataforma (lo pide el operador del core)

1. **Clave HMAC** nueva: `openssl rand -hex 32` → a tu env y a la entrada del
   módulo en `MODULE_REGISTRY_CONFIG` (`/etc/likekiri/modules.json` en prod):
   `{ "moduleId": "tu-modulo", "baseUrl": "http://127.0.0.1:PUERTO", "hmacKey": "…" }`
2. **Origen del remoteEntry** en `ALLOWED_REMOTE_ORIGINS` del core (si es uno
   nuevo).
3. **Caddy**: un `handle_path /modules/tu-modulo/* → reverse_proxy
   127.0.0.1:PUERTO` en el bloque del dominio que te sirva (likekiri.com para
   islas web, admin.likekiri.com para páginas de admin). Siempre con backup +
   `caddy validate` antes del reload.
4. **systemd**: copia una unidad `likekiri-module-*.service` y ajusta rutas.
5. Reinicia el core (o espera el refresco, `REGISTRY_REFRESH_MINUTES`). En
   admin → Plataforma → Registry ves tu módulo, su versión y los errores del
   último pull si algo no validó.

---

## Integrar al ADMIN

**Ruta** con `surface: "admin"`. Sin `ssr`. Los `:params` de la ruta llegan
como props a tu componente.

```jsonc
{ "surface": "admin", "path": "/tu-modulo", "component": "./MiPagina",
  "permissions": ["tu-modulo.leer"] }
```

**Menú**: dos formas, ambas en el slot `sidebar`:

```jsonc
// hoja: un enlace directo en el menú principal
{ "surface": "admin", "slot": "sidebar", "label": "Tu Módulo", "order": 40,
  "path": "/tu-modulo" }

// submenú: UNA entrada en el menú principal con hijos colgando
{ "surface": "admin", "slot": "sidebar", "label": "Tu Módulo", "order": 40,
  "mode": "toggle",            // "toggle" = plegable | "expanded" = siempre abierto
  "children": [
    { "label": "Panel",  "path": "/tu-modulo",        "order": 1 },
    { "label": "Ajustes","path": "/tu-modulo/ajustes","order": 2 }
  ] }
```

El core filtra cada hoja/hijo por los permisos de la sesión (visible solo si
apunta a una ruta visible) y **oculta el grupo entero si queda vacío**. Sin
sesión, el manifest de admin llega vacío: la superficie es privada.

Notas de la SPA:

- Tu página puede llamar a las APIs del core (`/api/...`) por el mismo origen,
  con `credentials: 'same-origin'`. Los POST/PUT/DELETE llevan el header
  `Origin` automáticamente (CSRF del core).
- Dispones de las clases CSS del shell (`panel`, `tarjeta`, `boton`, `chip`,
  `error`, `aviso`, tabla…) y de los design tokens de `@likekiri/tokens`.
  Acoplamiento estético asumido; no dependas de nada más del shell.
- Si tu módulo cae, el shell muestra un error solo en tu página; el panel
  sigue funcionando.

## Integrar al FRONTEND público (web)

**Ruta** con `surface: "web"` y `ssr: "shell"` (único modo hoy): el core
renderiza en servidor el layout, `<head>` y metadatos, y emite tu isla como
placeholder con las props serializadas de forma segura; el navegador carga tu
`remoteEntry.js` y monta el componente.

```jsonc
{ "surface": "web", "path": "/tu-modulo/:slug", "component": "./MiIsla",
  "ssr": "shell", "permissions": [] }
```

- **Props** = los `:params` de la URL (`{ slug: "demo" }`). Tipa tu componente
  con esas props.
- Tu componente corre **solo en el navegador**: nada de APIs de Node, y el
  primer render debe funcionar sin datos (muestra tu propio loading si luego
  haces fetch).
- El `remoteEntry` debe estar en un origen de la lista blanca; en producción
  se sirve por `https://likekiri.com/modules/tu-modulo/…`.
- SEO: tus rutas web **sin** parámetros entran solas al `sitemap.xml`. El
  `<title>` de páginas de isla hoy es genérico (limitación conocida del
  contrato v1).
- Si tu isla falla al cargar, su hueco muestra un aviso y el resto de la
  página sigue viva.

## Checklist de aceptación de tu módulo

```bash
# 1. El manifest valida (mismo validador que usa el core):
node -e "const {validateManifest}=require('@likekiri/contract');
console.log(validateManifest(require('./mi-manifest.json'),
  {allowedRemoteOrigins:['https://likekiri.com']}))"

# 2. El core lo sincroniza sin errores (log: 'registry sincronizado: …')
# 3. web: curl -s https://likekiri.com/tu-modulo/x | grep data-likekiri-island
#    → el HTML del layout llega SIN ejecutar JS, con tu placeholder dentro
# 4. admin: tu menú aparece con tu sesión y NO aparece para un rol sin permisos
# 5. Prueba de fuego: quita tu módulo de modules.json y reinicia el core.
#    Si algo del core o del resto del sitio se rompe, tu módulo está mal acoplado.
```

## Errores comunes

| Síntoma | Causa probable |
|---|---|
| "firma HMAC de la respuesta inválida" | Clave distinta entre tu env y modules.json, o reloj desfasado (ventana de 30 s) |
| "está fuera del namespace" | Una ruta/menú fuera de `/{namespace}` |
| "no está en la lista blanca" | Falta tu origen en `ALLOWED_REMOTE_ORIGINS` del core |
| "ya pertenece al módulo X" | Colisión de ruta: el primero gana; cambia tu path |
| La página dice "módulo no disponible" | Mira la consola del navegador: remoteEntry 404 (Caddy/handle_path), o el export no coincide con el nombre expuesto |
| Tu menú no aparece | La sesión no tiene los permisos que exige la ruta a la que apunta |
| Campos "de más" rechazados | El manifest es estricto: elimina lo que el contrato no define |

## Referencias

- Contrato y validación: `packages/contract` (`CONTRACT_VERSION`, esquemas, HMAC).
- Decisiones: ADR 004 (SSR e islas), ADR 005 (admin por módulos y submenús).
- Plantillas: `modules/ejemplo-web` (isla web comentada, en producción en
  `/ejemplo-web/demo`), `modules/ejemplo-admin` (submenú toggle + permiso
  declarado + llamada a la API del core).
- Otros ejemplos: `modules/hello` (isla web + página admin), `modules/cuentas`
  (submenú, permisos consumidos), `modules/registry` (submenú toggle).
