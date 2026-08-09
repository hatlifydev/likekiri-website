# Módulo chat — conversación en vivo por WebSocket

Widget flotante en el sitio público y panel de agente en el admin, conectados
en tiempo real por WebSocket. Dominio, WebSocket y almacenamiento propios; el
core solo lo registra (manifest firmado) y valida la sesión del agente.

## Cómo funciona

```
likekiri.com                              admin.likekiri.com
ChatWidgetIsland (widget global) ─┐        ChatAdminPage (agente) ─┐
  POST /api/sesion (cookie visitante)        WS ?rol=agente         │
  WS ?conv=<id>  ◄──── tiempo real ────►  server del módulo chat ◄──┘
                                          ├─ ws (WebSocketServer en /ws)
                                          ├─ SQLite (conversaciones, mensajes)
                                          ├─ identidad: anónimo | cliente | agente
                                          └─ no leídos + notificación al agente
```

- **Widget global**: registrado en el manifest con `widget: true` (contrato
  v0.4). El core lo emite como isla flotante en TODAS las páginas del sitio.
- **Identidad**: visitante anónimo (cookie `__Host-lk_chat`); si trae sesión de
  cliente, el chat consulta el módulo clientes (mejor esfuerzo, con timeout —
  si clientes cae, degrada a anónimo); el agente es una sesión admin del core
  con permiso `chat.read`/`chat.write`.
- **Tiempo real**: WebSocket bajo `/ws` (Caddy proxya el upgrade). El visitante
  y el agente reciben mensajes al instante; todo se persiste.
- **Notificación**: cada mensaje entrante incrementa `noLeidosAgente` y emite
  evento a los agentes conectados (aunque no tengan la conversación abierta).

## Costuras a futuro (contempladas, no implementadas)

- `canal: 'whatsapp'` en conversaciones/mensajes (hoy solo `web`).
- `autor: 'bot'` para respuestas automáticas de un RAG.
- `derivadoA` para derivar una conversación a WhatsApp.

## Correr en desarrollo

```bash
pnpm --filter @likekiri/module-chat build
MODULE_HMAC_KEY=<clave-32+> node modules/chat/server.mjs   # puerto 4009, WS en /ws
```
