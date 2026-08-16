# Fuentes self-hosted

Sin CDN de terceros (coherente con la política de privacidad del sitio). Todos
los archivos provienen de los repositorios oficiales, subseteados a
latin + latin-ext con fontTools (`--layout-features='*' --flavor=woff2`).

| Archivo | Familia | Origen oficial | Versión | Licencia |
|---|---|---|---|---|
| `inter-regular.woff2`, `inter-semibold.woff2` | Inter 400/600 | github.com/rsms/inter (release v4.1, `web/`) | 4.1 | OFL 1.1 (`LICENSE-inter.txt`) |
| `source-serif-4-display-semibold.woff2` | Source Serif 4 Display 600 | github.com/adobe-fonts/source-serif (release 4.005R, `TTF/`) | 4.005 | OFL 1.1 (`LICENSE-source-serif.md`) |

Decisión de Fase 2: titulares en Source Serif 4 (óptico Display, peso 600,
tracking 0) y cuerpo/UI en Inter. Space Grotesk se evaluó como opción A y se
retiró tras la comparativa.
