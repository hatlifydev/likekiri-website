# ADR 003 — Sin Redis: sesiones en Postgres, registry en memoria

Fecha: 2026-08-09
Estado: aceptado

## Contexto

El brief original contemplaba Redis para "sesiones y cache del registry".
El usuario decidió en Fase 2 que Redis no es necesario; Postgres sí, instalado
nativo vía apt en el VPS.

## Decisión

- **Sesiones**: viven en Postgres (tabla `Session` con `tokenHash`), que era ya
  el diseño del brief §8.1. Redis no aportaba nada aquí salvo velocidad de
  lookup, irrelevante a esta escala.
- **Cache del registry de módulos**: en memoria del proceso del core. El core
  es un único proceso (ADR del brief §2), el registro es pull determinista al
  arrancar + refresco cada N minutos (`REGISTRY_REFRESH_MINUTES`), así que el
  estado se reconstruye solo tras un reinicio y no necesita almacenamiento
  compartido.
- **PostgreSQL en el VPS**: instalación nativa vía apt (Debian 13 → Postgres
  17), escuchando solo en 127.0.0.1. Base `likekiri`, rol `likekiri` con
  contraseña generada aleatoriamente que vive solo en `.env` (gitignored) y en
  el futuro `/etc/likekiri/core.env` (600).
- `infra/docker-compose.yml` queda solo con Postgres, para máquinas de
  desarrollo que prefieran Docker.

## Consecuencias

- Una dependencia de infraestructura menos que operar y asegurar.
- Si algún día el core escala a varios procesos, el rate limiting de login y el
  cache del registry deberán moverse a un almacén compartido (Postgres o un
  Redis que se añadiría entonces); dejarlo anotado en ese momento.
- El refresco del registry tras un deploy es inmediato (sync al arrancar).
