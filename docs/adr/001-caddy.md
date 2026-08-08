# ADR 001 — Integración con la instalación de Caddy existente

Fecha: 2026-08-09
Estado: aceptado (pendiente de confirmación del usuario para Fase 7)

## Contexto

Fase 0 del proyecto likekiri: reconocimiento del VPS antes de escribir código.
Hallazgos verificados en la máquina (no supuestos):

### Cómo corre Caddy

- **Escenario: systemd nativo.** `caddy.service` habilitado y activo desde
  `/usr/lib/systemd/system/caddy.service`, con drop-in
  `/etc/systemd/system/caddy.service.d/override.conf` (`Restart=always`, `RestartSec=3s`).
- Binario `/usr/bin/caddy`, versión **v2.11.4**, config `/etc/caddy/Caddyfile`.
- No hay Docker en la máquina (`docker: command not found`).
- Admin endpoint por defecto en `127.0.0.1:2019`.
- Recarga: `caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy`.

### Configuración actual

- `/etc/caddy/Caddyfile` contiene **un único bloque de sitio**:
  `llmtrainer.likekiri.com` → `reverse_proxy 127.0.0.1:8000`, con `basic_auth`
  (hash bcrypt, omitido aquí), `request_body max_size 200MB`, `encode`, y log en
  `/var/log/caddy/likekiri.log`.
- **No hay bloque global** (sin email ACME, sin storage custom, sin admin custom).
- **No hay `import`** ni directorios `sites-enabled/` o `conf.d/`.
  → **Punto de extensión: añadir bloques al final del Caddyfile**, con backup previo
  (`cp Caddyfile Caddyfile.bak.$(date +%F-%H%M)`). Nunca reescribir el archivo.
- Certificados: **Let's Encrypt HTTP-01** (existe
  `/var/lib/caddy/.../acme-v02.api.letsencrypt.org-directory/llmtrainer.likekiri.com`;
  `caddy list-modules` no muestra ningún plugin `dns.providers.*`).
  No hay credenciales DNS que gestionar; los certs de los tres hostnames nuevos
  se emitirán por HTTP-01 al recargar.

### Sitios y puertos internos en uso

| Puerto | Proceso | Qué es |
|---|---|---|
| 80 / 443 | caddy | reverse proxy público |
| 2019 (loopback) | caddy | admin endpoint |
| 8000 (loopback) | uvicorn (`likekiri-api.service`) | app existente "LikeKiri SLM Trainer" en `/opt/likekiri` |
| 22 | sshd | SSH |
| 25xxx–46xxx (loopback) | code-server / VS Code | puertos efímeros de la sesión de desarrollo |

### DNS (verificado 2026-08-09)

IP pública del VPS: `159.195.214.249`.

- `likekiri.com` → A `159.195.214.249` ✔
- `www.likekiri.com` → CNAME `likekiri.com` → `159.195.214.249` ✔
- `admin.likekiri.com` → CNAME `likekiri.com` → `159.195.214.249` ✔
- `llmtrainer.likekiri.com` → CNAME `likekiri.com` → `159.195.214.249` ✔ (sitio existente)

Los tres registros necesarios ya apuntan al VPS: no hay riesgo de quemar
rate limits de Let's Encrypt por DNS mal apuntado.

## Decisión

1. **Puerto interno del core: `3000`**, escuchando solo en `127.0.0.1`.
   Verificado libre con `ss -tlnp`; el único servicio de aplicación existente usa 8000.
2. **Punto de extensión de Caddy: append al final de `/etc/caddy/Caddyfile`**
   (no existe mecanismo de `import`). Siempre con backup fechado previo y
   `caddy validate` antes de `systemctl reload caddy`.
3. No se añade bloque global nuevo. Si en Fase 7 se quiere email ACME, se creará
   el bloque global una sola vez, al inicio del archivo, avisando antes.
4. El servicio del core seguirá el patrón del existente `likekiri-api.service`
   (loopback + EnvironmentFile), pero con usuario dedicado y endurecimiento
   (el existente corre como root; ver riesgos).

## Consecuencias

- Fase 7 tocará un archivo compartido con un sitio en producción
  (`llmtrainer.likekiri.com`): backup + validate son obligatorios, y tras la
  recarga hay que verificar explícitamente que llmtrainer sigue respondiendo.
- Al recargar con los bloques nuevos, Caddy emitirá certificados para
  `likekiri.com`, `www.likekiri.com` y `admin.likekiri.com` por HTTP-01;
  el puerto 80 ya lo atiende Caddy, así que no hay bloqueo.
- Nombre de log: el sitio existente ya usa `/var/log/caddy/likekiri.log`;
  los nuestros serán `likekiri.access.log` y `likekiri-admin.access.log`
  para no colisionar.

## Observaciones / riesgos detectados (no se actuó sobre ellos)

- `likekiri-api.service` **corre como root** (sin `User=`). Funciona, pero es
  un endurecimiento pendiente que no toca a este proyecto decidir. Nuestro
  servicio nuevo sí usará usuario dedicado.
- `likekiri.com` ya recibe tráfico de bots (probes de `/wp-admin/…`) que hoy
  reciben 308→HTTPS y fallan el TLS. Cuando el sitio exista, ese ruido llegará
  al core: el catch-all debe responder 404 barato a hosts/rutas desconocidos.
- **pnpm no está instalado** (Node v20.20.2 LTS sí). Instalarlo es prerequisito
  de Fase 1 (vía corepack: `corepack enable pnpm`).
