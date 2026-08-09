# ADR 009 — Módulo ops: respaldo de BD y commit/push desde el admin

Fecha: 2026-08-10
Estado: aceptado

## Contexto

Se pidió, desde el panel de admin, respaldar la base de datos y hacer
commit + push del código a GitHub. Ambas son operaciones privilegiadas en un
VPS que además sirve un sitio en producción.

## Decisiones

- **Módulo `ops`** (admin-only, puerto 4010), como el resto: API propia,
  guardado por permisos del core (`ops.read`, `ops.backup`, `ops.deploy`).
  Sin superficie web (solo `handle_path` en el bloque admin de Caddy).
- **Respaldo**: el propio proceso ejecuta `pg_dump -Fc` (formato custom,
  comprimido, restaurable con `pg_restore`) con `DATABASE_URL` sobre 127.0.0.1,
  a `/srv/likekiri/backups`. Retención de los 20 más recientes. Descarga
  autenticada. No requiere privilegios extra.
- **Git**: el repo canónico vive en `/root/likekiri` (root) y el servicio corre
  como `likekiri`. En vez de correr el servicio como root, se usa un **script
  root de acción FIJA** `/usr/local/bin/likekiri-ops` (status/commit/push/
  set-remote) invocado por **sudo NOPASSWD restringido a ese script**
  (`/etc/sudoers.d/likekiri-ops`). El servicio nunca ejecuta shell arbitrario;
  el mensaje de commit viaja como argv (execFile), sin inyección.
- **Sandbox de la unidad `ops`**: es el único módulo que escala privilegios, así
  que su unit lleva `NoNewPrivileges=no` y `ProtectHome=no` (para que el script
  root alcance `/root/likekiri`), con `ProtectSystem=strict` +
  `ReadWritePaths=/srv/likekiri/backups /root/likekiri`. El proceso no-root
  sigue sin poder leer `/root` por permisos Unix; solo el script root puede.

## Pendiente / consecuencias

- **GitHub aún no está conectado**: no hay remoto ni credencial. El commit
  funciona; el push queda deshabilitado hasta configurar el remoto (repo +
  PAT o deploy key). El wrapper ya soporta `set-remote`; el operador lo
  configura por CLI (no por el navegador, para no exponer el token).
- El respaldo es local al VPS; para resiliencia real convendría replicarlo
  fuera del servidor (fase futura).
- `ops.deploy` commitea el árbol de trabajo actual de `/root/likekiri`.
