# ADR 002 — Stack, versiones y tooling del monorepo

Fecha: 2026-08-09
Estado: aceptado

## Contexto

Fase 1: el brief fija el stack (pnpm, NestJS, Prisma, Redis, React+Vite,
Module Federation, argon2, zod) pero no las versiones. Todas las versiones se
consultaron contra npm el 2026-08-09 (`npm view <pkg> version`), no de memoria.

## Decisiones

### Node 22 LTS (antes: 20.20.2, EOL)

El VPS tenía Node 20.20.2 de NodeSource, EOL desde abril 2026 e incompatible
con pnpm 11 (exige ≥22.13). Se cambió el repo NodeSource de `node_20.x` a
`node_22.x` (backup del source en `/root/nodesource.sources.bak.*`) y se
instaló **Node 22.23.2**. Nada más en el VPS usaba ese Node: la única app en
producción es Python y code-server embebe el suyo. pnpm **11.20.0** vía corepack.

### TypeScript 5.9.3, no 7.x

El `latest` de npm es 7.0.2 (compilador nativo). Se fija **5.9.3** porque el
toolchain de NestJS aún fija TS 5.9.x y el core depende de
`experimentalDecorators` + `emitDecoratorMetadata`, cuyo soporte en TS7 no está
probado en este ecosistema. Revisar cuando NestJS soporte TS7 oficialmente.

### Module Federation: @module-federation/vite 1.20.5

Frente a `@originjs/vite-plugin-federation` (1.4.1, sin actividad): el plugin
oficial del equipo de Module Federation declara peer `vite ^5–^8`, compatible
con el Vite 8 elegido. Se integra en la Fase 6.

### Resto del stack (fijado exacto en cada package.json)

- NestJS 11.1.28 (+ platform-express; Express 5, `@types/express` 5.0.6)
- Vite 8.2.1, @vitejs/plugin-react 6.0.5 (sus peers de rolldown/react-compiler
  son opcionales), React 19.2.8
- zod 4.4.3 — ojo: API v4 (`z.strictObject`), no la v3
- Prisma 7.9.1, argon2 0.45.1, ioredis 6.0.0 (se añaden cuando toquen, Fases 2–4)
- Tests: `node:test` + tsx en paquetes de backend/librería (evita arrastrar
  vitest/vite donde no hay frontend); vitest 4.x se añadirá donde haya
  componentes cuando existan tests de UI.
- Builds: `tsc` para core/contract/tokens (CommonJS vía NodeNext), Vite para
  shells y módulos (ESM).

### Postgres y Redis

No hay Docker en el VPS ni Postgres/Redis instalados. `infra/docker-compose.yml`
es SOLO para máquinas de desarrollo. Para el VPS la propuesta es instalación
nativa vía apt escuchando en 127.0.0.1 — pendiente de confirmación del usuario,
se necesita a partir de la Fase 2 (Redis) y Fase 4 (Postgres).

## Consecuencias

- Reproducibilidad: versiones exactas en los package.json + `pnpm-lock.yaml`.
- El salto a TS7 y a React Compiler queda explícitamente pospuesto.
- Quien clone necesita Node ≥22.13 (campo `engines` en el package.json raíz).
