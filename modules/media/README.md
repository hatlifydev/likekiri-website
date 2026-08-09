# Módulo media — gestor multimedia

Biblioteca de archivos del admin: subir imágenes, recortarlas visualmente,
quitarles el fondo blanco y servirlas públicamente para usarlas en el sitio
(logo, imágenes de contenido). Módulo independiente con API y almacenamiento
propios (SQLite + disco), como `clientes`.

## Qué hace

- **Subir** (binario directo, sin multipart): PNG, JPG, WEBP, SVG, ICO — máx. 15 MB.
- **Recortar**: selección visual por arrastre en el admin; el recorte lo aplica
  el servidor con sharp.
- **Fondo transparente**: flood-fill desde los bordes — solo se vuelve
  transparente el blanco CONECTADO al borde; los blancos interiores (letras,
  brillos) se conservan. El resultado pasa a PNG.
- **Borrar** y **copiar URL pública**.
- **Servir**: `https://likekiri.com/modules/media/files/<id>.<ext>` (también
  por el origen del admin), CORS abierto, cache corta (los archivos se editan).

## Seguridad

- API solo con sesión de administrador del core (delegación a
  `GET /api/auth/me`): `media.read` para leer, `media.write` para mutar.
- CSRF por Origin en mutaciones. Los archivos públicos son solo-lectura.

## Correr en desarrollo

```bash
pnpm --filter @likekiri/module-media build
MODULE_HMAC_KEY=<clave-32+> node modules/media/server.mjs   # puerto 4008
```

Variables: `MODULE_PORT` (4008), `MODULE_HMAC_KEY`, `MODULE_REMOTE_ENTRY`,
`MODULE_PUBLIC_DIR`, `MODULE_DATA_DIR`, `CORE_INTERNAL_URL`, `ADMIN_ORIGIN`.
