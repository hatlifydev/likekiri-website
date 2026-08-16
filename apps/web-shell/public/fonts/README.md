# Fuentes self-hosted

Sin CDN de terceros (coherente con la política de privacidad del sitio). Todos
los archivos provienen de los repositorios oficiales, subseteados a
latin + latin-ext con fontTools (`--layout-features='*' --flavor=woff2`).

| Archivo | Familia | Origen oficial | Versión | Licencia |
|---|---|---|---|---|
| `inter-regular.woff2`, `inter-semibold.woff2` | Inter 400/600 | github.com/rsms/inter (release v4.1, `web/`) | 4.1 | OFL 1.1 (`LICENSE-inter.txt`) |
| `source-serif-4-display-semibold.woff2` | Source Serif 4 Display 600 | github.com/adobe-fonts/source-serif (release 4.005R, `TTF/`) | 4.005 | OFL 1.1 (`LICENSE-source-serif.md`) |
| `space-grotesk-var.woff2` | Space Grotesk variable (wght 300–700) | github.com/floriankarsten/space-grotesk (release 2.0.0, `woff2/`) | 2.0.0 | OFL 1.1 (`LICENSE-space-grotesk.txt`) |

`space-grotesk-var.woff2` existe solo para la comparativa A/B de la Fase 2
(`/assets/preview-tipografia.html`); se elimina si gana la opción B.
