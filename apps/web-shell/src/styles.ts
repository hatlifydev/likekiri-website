import { cssVariables } from '@likekiri/tokens';

/**
 * CSS del shell público. Esquema de marca: base CLARA para el contenido,
 * franjas OSCURAS (#12181F) en header/hero/footer, y los colores corporativos
 * (verde #2E8B57, naranja #D99B3B) como acentos. Los tokens base son la paleta
 * dark (los usa el admin tal cual); aquí se sobreescriben las variables de
 * superficie para la versión clara, conservando marca y acento.
 */
export const shellCss = `
:root {
  ${cssVariables()}
  /* superficie web: base clara */
  --lk-color-background: #ffffff;
  --lk-color-surface: #f4f6f8;
  --lk-color-text: #1d2630;
  --lk-color-textMuted: #5b6674;
  --lk-color-border: #e2e7ec;
  --lk-color-danger: #b91c1c;
  /* franjas oscuras de marca */
  --lk-dark: #12181f;
  --lk-dark-container: #243323;
}
* { box-sizing: border-box; margin: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: var(--lk-font-sans);
  color: var(--lk-color-text);
  background: var(--lk-color-background);
  line-height: 1.6;
  /* Footer siempre al fondo de la pantalla, aunque la página sea corta. */
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
main { flex: 1; }
a { color: var(--lk-color-brand); text-decoration: none; }
a:hover { text-decoration: underline; }
.container { max-width: 1080px; margin: 0 auto; padding: 0 1.25rem; }

.anuncio {
  background: var(--lk-color-accent);
  color: #12181f;
  text-align: center;
  padding: 0.55rem 1.25rem;
  font-size: 0.92rem;
  font-weight: 600;
}

header.site {
  background: var(--lk-dark);
}
header.site .container {
  display: flex; align-items: center; justify-content: space-between;
  min-height: 6rem; gap: 1.5rem; padding-top: 0.5rem; padding-bottom: 0.5rem;
}
.brand:hover { text-decoration: none; }
nav.main { display: flex; gap: 1.4rem; flex-wrap: wrap; align-items: center; }
nav.main a { color: #c6cfd8; font-size: 0.97rem; font-weight: 500; }
nav.main a:hover { color: #ffffff; text-decoration: none; }

.hero {
  background: linear-gradient(160deg, var(--lk-dark) 55%, var(--lk-dark-container) 130%);
  color: #f4f5f7;
  padding: 4.5rem 0 5rem;
  border-radius: 0 0 36px 36px;
}
.hero h1 { font-size: clamp(2rem, 5vw, 3.25rem); line-height: 1.12; letter-spacing: -0.03em; max-width: 24ch; color: #ffffff; }
.hero p.lead { margin-top: 1.25rem; font-size: 1.2rem; color: #b9c3cd; max-width: 60ch; }
.hero .acciones { margin-top: 2.25rem; display: flex; gap: 0.85rem; flex-wrap: wrap; }

.boton {
  display: inline-block; padding: 0.75rem 1.7rem; border-radius: 999px;
  background: var(--lk-color-brand); color: #ffffff;
  font-weight: 600; border: 1px solid var(--lk-color-brand);
}
.boton:hover { text-decoration: none; filter: brightness(1.1); }
.boton.secundario { background: transparent; color: inherit; border-color: currentColor; opacity: 0.9; }

section.bloque { padding: 4rem 0; }
section.bloque.alterno { background: var(--lk-color-surface); }
section.bloque h2 { font-size: 1.8rem; letter-spacing: -0.02em; margin-bottom: 0.75rem; color: var(--lk-dark); }
section.bloque > .container > p.intro { color: var(--lk-color-textMuted); max-width: 65ch; margin-bottom: 2rem; }

.tarjetas { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.4rem; margin-top: 1.5rem; }
.tarjeta {
  background: #ffffff; border: 1px solid var(--lk-color-border);
  border-radius: 20px; padding: 1.6rem;
  box-shadow: 0 2px 10px rgba(18, 24, 31, 0.05);
}
.tarjeta h3 { font-size: 1.1rem; margin-bottom: 0.5rem; color: var(--lk-dark); }
.tarjeta p { color: var(--lk-color-textMuted); font-size: 0.95rem; }

.persona .avatar {
  width: 64px; height: 64px; border-radius: 50%;
  background: var(--lk-color-brand); color: #ffffff;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 1.3rem; margin-bottom: 1rem;
}
.persona .rol { color: var(--lk-color-brand); font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }

.prosa { max-width: 72ch; }
.prosa h1 { color: var(--lk-dark); }
.prosa h2 { font-size: 1.35rem; margin: 2rem 0 0.75rem; color: var(--lk-dark); }
.prosa p, .prosa li { color: var(--lk-color-text); margin-bottom: 0.75rem; }
.prosa ul, .prosa ol { padding-left: 1.5rem; margin-bottom: 1rem; }
.prosa .fecha { color: var(--lk-color-textMuted); font-size: 0.9rem; }

.lista-check { list-style: none; padding-left: 0; }
.lista-check li { padding-left: 1.75rem; position: relative; margin-bottom: 0.6rem; }
.lista-check li::before { content: '✓'; position: absolute; left: 0; color: var(--lk-color-brand); font-weight: 700; }

footer.site {
  background: var(--lk-dark);
  color: #aab6c0;
  padding: 3rem 0 2.5rem;
  margin-top: 3rem;
  border-radius: 36px 36px 0 0;
}
footer.site .container { display: flex; justify-content: space-between; gap: 1.5rem; flex-wrap: wrap; font-size: 0.9rem; align-items: flex-start; }
footer.site nav { display: flex; gap: 1.25rem; flex-wrap: wrap; }
footer.site a { color: #c6cfd8; }
footer.site a:hover { color: #ffffff; }
footer.site .marca-pie img { height: 58px; display: block; margin-bottom: 0.9rem; }

[data-likekiri-island] { min-height: 4rem; }
.isla-cargando, .isla-error {
  border: 1px dashed var(--lk-color-border); border-radius: 14px;
  padding: 1.25rem; color: var(--lk-color-textMuted); font-size: 0.95rem;
}
.isla-error { border-color: var(--lk-color-danger); color: var(--lk-color-danger); }

.pagina-error { padding: 6rem 0; text-align: center; }
.pagina-error h1 { font-size: 3rem; color: var(--lk-dark); }
.pagina-error p { color: var(--lk-color-textMuted); margin-top: 0.75rem; }
`;
