import { cssVariables } from '@likekiri/tokens';

/** CSS del shell, inyectado inline en el <head> por el SSR. */
export const shellCss = `
:root { ${cssVariables()} }
* { box-sizing: border-box; margin: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: var(--lk-font-sans);
  color: var(--lk-color-text);
  background: var(--lk-color-background);
  line-height: 1.6;
}
a { color: var(--lk-color-brand); text-decoration: none; }
a:hover { text-decoration: underline; }
.container { max-width: 1080px; margin: 0 auto; padding: 0 1.25rem; }

header.site {
  border-bottom: 1px solid var(--lk-color-border);
  background: var(--lk-color-background);
}
header.site .container {
  display: flex; align-items: center; justify-content: space-between;
  height: 4rem; gap: 1rem;
}
.brand { font-weight: 700; font-size: 1.25rem; color: var(--lk-color-text); letter-spacing: -0.02em; }
.brand:hover { text-decoration: none; }
.brand span { color: var(--lk-color-brand); }
nav.main { display: flex; gap: 1.25rem; flex-wrap: wrap; }
nav.main a { color: var(--lk-color-textMuted); font-size: 0.95rem; }
nav.main a:hover { color: var(--lk-color-brand); text-decoration: none; }

.hero { padding: 5rem 0 4rem; }
.hero h1 { font-size: clamp(2rem, 5vw, 3.25rem); line-height: 1.15; letter-spacing: -0.03em; max-width: 22ch; }
.hero p.lead { margin-top: 1.25rem; font-size: 1.2rem; color: var(--lk-color-textMuted); max-width: 60ch; }
.hero .acciones { margin-top: 2rem; display: flex; gap: 0.75rem; flex-wrap: wrap; }

.boton {
  display: inline-block; padding: 0.7rem 1.4rem; border-radius: var(--lk-radius-md);
  background: var(--lk-color-brand); color: var(--lk-color-brandContrast);
  font-weight: 600; border: 1px solid var(--lk-color-brand);
}
.boton:hover { text-decoration: none; filter: brightness(1.08); }
.boton.secundario { background: transparent; color: var(--lk-color-brand); }

section.bloque { padding: 3.5rem 0; }
section.bloque.alterno { background: var(--lk-color-surface); }
section.bloque h2 { font-size: 1.75rem; letter-spacing: -0.02em; margin-bottom: 0.75rem; }
section.bloque > .container > p.intro { color: var(--lk-color-textMuted); max-width: 65ch; margin-bottom: 2rem; }

.tarjetas { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.25rem; margin-top: 1.5rem; }
.tarjeta {
  background: var(--lk-color-background); border: 1px solid var(--lk-color-border);
  border-radius: var(--lk-radius-lg); padding: 1.5rem;
}
.tarjeta h3 { font-size: 1.1rem; margin-bottom: 0.5rem; }
.tarjeta p { color: var(--lk-color-textMuted); font-size: 0.95rem; }

.persona .avatar {
  width: 64px; height: 64px; border-radius: 50%;
  background: var(--lk-color-brand); color: var(--lk-color-brandContrast);
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 1.3rem; margin-bottom: 1rem;
}
.persona .rol { color: var(--lk-color-brand); font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }

.prosa { max-width: 72ch; }
.prosa h2 { font-size: 1.35rem; margin: 2rem 0 0.75rem; }
.prosa p, .prosa li { color: var(--lk-color-text); margin-bottom: 0.75rem; }
.prosa ul, .prosa ol { padding-left: 1.5rem; margin-bottom: 1rem; }
.prosa .fecha { color: var(--lk-color-textMuted); font-size: 0.9rem; }

.lista-check { list-style: none; padding-left: 0; }
.lista-check li { padding-left: 1.75rem; position: relative; margin-bottom: 0.6rem; }
.lista-check li::before { content: '✓'; position: absolute; left: 0; color: var(--lk-color-brand); font-weight: 700; }

footer.site { border-top: 1px solid var(--lk-color-border); padding: 2.5rem 0; margin-top: 2rem; }
footer.site .container { display: flex; justify-content: space-between; gap: 1.5rem; flex-wrap: wrap; color: var(--lk-color-textMuted); font-size: 0.9rem; }
footer.site nav { display: flex; gap: 1.25rem; flex-wrap: wrap; }
footer.site a { color: var(--lk-color-textMuted); }

[data-likekiri-island] { min-height: 4rem; }
.isla-cargando, .isla-error {
  border: 1px dashed var(--lk-color-border); border-radius: var(--lk-radius-md);
  padding: 1.25rem; color: var(--lk-color-textMuted); font-size: 0.95rem;
}
.isla-error { border-color: var(--lk-color-danger); color: var(--lk-color-danger); }

.pagina-error { padding: 6rem 0; text-align: center; }
.pagina-error h1 { font-size: 3rem; }
.pagina-error p { color: var(--lk-color-textMuted); margin-top: 0.75rem; }
`;
