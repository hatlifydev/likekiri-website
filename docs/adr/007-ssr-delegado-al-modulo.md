# ADR 007 — SSR delegado al módulo (ssr: "server")

Fecha: 2026-08-09
Estado: aceptado

## Contexto

Con `ssr: "shell"` el core renderiza solo el layout y las islas se montan en
cliente: el usuario ve "Cargando componente…" hasta que llega el bundle
federado. El usuario pidió SSR completo de las islas **sin ir contra la
arquitectura**, cuya regla dura es que el core jamás ejecuta código de módulos
en su proceso (el brief descartó explícitamente el SSR federado en el core).

## Decisión

Nuevo modo de ruta en el contrato (v0.3, aditivo): **`ssr: "server"`** — el
HTML de la isla lo produce **el servidor del propio módulo**, que ya existe y
ya está aislado:

1. El módulo construye un bundle SSR aparte (`vite build --ssr`, sin
   federación) y su `server.mjs` expone `POST /render` → `renderToString` del
   componente pedido. La petición del core llega **firmada con la clave HMAC
   del módulo** y el módulo la verifica.
2. El core (`RegistryService.renderRemote`) hace el POST por loopback con un
   **timeout duro de 400 ms**. Con respuesta: incrusta el HTML dentro del
   placeholder (`data-hydrate="1"`). Sin respuesta o error: emite el
   placeholder de siempre — **la degradación a "shell" es automática**.
3. El runtime de islas detecta `data-hydrate` y usa `hydrateRoot` (adopta el
   HTML ya pintado) en vez de `createRoot`.

Verificado en producción: `/clientes/acceso` entrega el formulario completo en
el HTML inicial sin ejecutar JS; con el servicio del módulo detenido, la misma
URL responde 200 con el placeholder y la isla se monta en cliente.

## Por qué esto respeta la arquitectura

- El código del módulo corre en el proceso del módulo — la frontera de fallo
  no se movió un milímetro. Un `renderToString` que explota mata (y reinicia)
  al módulo, nunca al core.
- SSR completo es una **mejora progresiva por ruta**: cada módulo elige
  `"shell"` o `"server"` ruta a ruta; los módulos existentes no cambian.
- El canal core↔módulo usa la misma autenticación HMAC por módulo del pull de
  manifests.

## Consecuencias y límites

- El render del shell espera al módulo hasta 400 ms (loopback: en la práctica,
  milisegundos). El timeout es el precio de no acoplar la disponibilidad.
- El primer render del componente debe ser determinista (mismo HTML en server
  y cliente) o React reporta *hydration mismatch*. Estados que dependen de
  fetch deben arrancar en "cargando" (así lo hace el portal).
- Sin contexto React compartido a través de la frontera: las islas son
  autocontenidas por diseño.
- `modules/clientes` es el primer caso (registro, acceso y portal); `hello` y
  `ejemplo-web` permanecen en `"shell"` como referencia del modo básico.
