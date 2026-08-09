# ADR 008 — Chat en vivo por WebSocket y widgets globales

Fecha: 2026-08-09
Estado: aceptado

## Contexto

Se pidió un chat propio en el sitio, en tiempo real, que persista, notifique al
backend, distinga sesión autenticada, permita responder desde el backend y, a
futuro, se conecte a un RAG y derive a WhatsApp — todo sin romper la
arquitectura (el core no conoce dominios).

## Decisiones

### Widgets globales (contrato v0.4, aditivo)

Una ruta web puede marcarse `widget: true`: en vez de ser una página, el core
la emite como **isla flotante en TODAS las páginas** del sitio. El registry la
expone (`webWidgets()`), el SSR la inyecta en cada render y fuerza el runtime
de islas aunque la página sea estática. Mecanismo general (sirve para chat,
banner de cookies, promos); el chat es el primer consumidor.

### El chat es un módulo con WebSocket propio

Fiel a la doctrina, el chat es un módulo independiente (`modules/chat`, puerto
4009) con su servidor, su WebSocket (`ws`) y su SQLite. El core solo lo
registra (manifest firmado) y valida la sesión del agente. El WebSocket vive
bajo `/ws`; Caddy proxya el upgrade automáticamente en `reverse_proxy`
(`handle_path /modules/chat/*` en ambos orígenes → 127.0.0.1:4009). Verificado
`wss://likekiri.com/modules/chat/ws` de punta a punta con TLS.

### Identidad en tres niveles

- **Anónimo**: cookie de visitante `__Host-lk_chat` (fijada por POST /api/sesion).
- **Cliente**: mejor esfuerzo — si el visitante trae la cookie de cliente, el
  chat consulta el módulo clientes con timeout; si clientes cae, degrada a
  anónimo (sin acoplar disponibilidad).
- **Agente**: sesión admin del core (`/api/auth/me`) con permiso
  `chat.read`/`chat.write`, validada en el handshake del WS y en la API.

### Tiempo real, persistencia y notificación

Mensajes por WS (visitante↔agente), persistidos en SQLite. Cada mensaje
entrante incrementa `noLeidosAgente` y emite evento a los agentes conectados
(notificación aunque no tengan la conversación abierta). El agente responde por
WS o REST.

### Costuras a futuro (contempladas, no implementadas)

El modelo ya trae `canal` (web|whatsapp), `autor` (visitante|agente|bot) y
`derivadoA`. Un RAG podría responder como `autor: 'bot'` en `onVisitanteMensaje`
(marcado con comentario), y una integración de WhatsApp añadiría el canal y la
derivación sin tocar el core ni el contrato.

## Consecuencias

- Si el módulo chat cae, el widget degrada (no conecta) y el resto del sitio
  sigue intacto; quitarlo de la config elimina el widget sin más.
- El chat→clientes es una dependencia best-effort con timeout; no rompe el
  test de desacoplamiento.
- WebSocket es un proceso de larga vida: su unidad systemd ya reinicia on-failure.
