import { cssVariables } from '@likekiri/tokens';

/**
 * CSS del shell público. Esquema de marca: base CLARA con contraste vertical
 * (líneas/degradados sutiles), franjas OSCURAS en header/hero/footer con
 * figuras decorativas animadas, y colores corporativos (verde, dorado) como
 * acentos. Diseño redondeado. Todas las animaciones respetan
 * prefers-reduced-motion.
 *
 * Estado (design-system §8): Fase 1 (plomería de tokens) y Fase 2 (tipografía
 * definitiva Source Serif 4 + Inter, hero con rama Kiri, header) aplicadas.
 * Literales que quedan a propósito, cada grupo se resuelve en su fase:
 * grises del footer, blancos puros restantes y radio 14px de islas (Fase 4);
 * duraciones/easings del reveal y separador Kiri bajo h2 (Fase 5).
 */
export const shellCss = `
/* Fuentes self-hosted (apps/web-shell/public/fonts, subset latin+latin-ext):
   Inter 400/600 para cuerpo/UI y Source Serif 4 (óptico Display, 600) para
   titulares — decisión de Fase 2, con tracking 0 (ver design-system §3.1). */
@font-face {
  font-family: 'Inter';
  src: url('/assets/fonts/inter-regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Inter';
  src: url('/assets/fonts/inter-semibold.woff2') format('woff2');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Source Serif 4';
  src: url('/assets/fonts/source-serif-4-display-semibold.woff2') format('woff2');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}
:root {
  ${cssVariables()}
}
* { box-sizing: border-box; margin: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: var(--lk-font-sans);
  color: var(--lk-color-text);
  background: var(--lk-color-background);
  line-height: var(--lk-type-body-lineHeight);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  overflow-x: hidden;
}
main { flex: 1; }
/* brandText y no brand: el verde puro da 4.03:1 sobre el fondo — falla AA (§2.2) */
a { color: var(--lk-color-brandText); text-decoration: none; }
a:hover { text-decoration: underline; }
:focus-visible { outline: 2px solid var(--lk-color-brandText); outline-offset: 2px; }
/* sobre franjas oscuras el foco necesita el verde legible en oscuro */
header.site :focus-visible, .franja-oscura :focus-visible, .hero :focus-visible, footer.site :focus-visible {
  outline-color: var(--lk-color-dark-brand);
}
.container { max-width: var(--lk-layout-container); margin: 0 auto; padding: 0 var(--lk-layout-gutter); }

.anuncio {
  background: var(--lk-color-accent); color: var(--lk-color-dark-base);
  text-align: center; padding: 0.55rem var(--lk-space-5); font-size: var(--lk-type-small-size); font-weight: 600;
}

/* ——— header: fijo al hacer scroll, logo centrado con el menú ——— */
header.site {
  background: var(--lk-color-dark-base); height: 84px;
  position: sticky; top: 0; z-index: 20;
  box-shadow: var(--lk-shadow-2);
}
header.site .container {
  display: flex; align-items: center; justify-content: space-between; height: 100%; gap: var(--lk-space-6);
}
.brand { position: relative; display: flex; align-items: center; }
.brand:hover { text-decoration: none; }
.brand img {
  height: 64px; display: block;
  filter: drop-shadow(0 8px 16px rgba(0,0,0,0.35));
  transition: transform 0.3s ease;
}
.brand:hover img { transform: translateY(-2px) scale(1.02); }
nav.main { display: flex; gap: 1.4rem; flex-wrap: wrap; align-items: center; }
nav.main a { color: var(--lk-color-dark-textSecondary); font-size: var(--lk-type-body-size); font-weight: 500; position: relative; }
nav.main a::after {
  content: ''; position: absolute; left: 0; bottom: -4px; width: 0; height: 2px;
  background: var(--lk-color-brand); transition: width 0.25s ease;
}
nav.main a:hover { color: var(--lk-color-dark-text); text-decoration: none; }
nav.main a:hover::after { width: 100%; }

.idiomas { display: inline-flex; gap: 2px; border: 1px solid var(--lk-color-dark-border); border-radius: var(--lk-radius-pill); overflow: hidden; }
.idiomas button {
  background: transparent; border: none; color: var(--lk-color-dark-textSecondary); font: inherit; font-size: var(--lk-type-caption-size); font-weight: 600;
  padding: var(--lk-space-1) 0.6rem; cursor: pointer;
}
.idiomas button:hover { color: var(--lk-color-dark-text); }
.idiomas button.activo { background: var(--lk-color-brand); color: var(--lk-color-brandContrast); }

/* ——— franjas oscuras con figuras decorativas ——— */
.franja-oscura { position: relative; background: var(--lk-color-dark-base); color: var(--lk-color-dark-text); overflow: hidden; }
.franja-oscura .container { position: relative; z-index: 2; }
.figuras { position: absolute; inset: 0; z-index: 1; pointer-events: none; }
.figura { position: absolute; opacity: 0.5; }
.figura.leaf { color: var(--lk-color-brand); }
.figura.arc { color: var(--lk-color-accent); }
.figura.dot { border-radius: 50%; background: currentColor; }
@keyframes flotar { 0%,100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-18px) rotate(6deg); } }
@keyframes flotar2 { 0%,100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(14px) rotate(-5deg); } }
@keyframes pulso { 0%,100% { opacity: 0.25; } 50% { opacity: 0.7; } }
.anim-flotar { animation: flotar 9s ease-in-out infinite; }
.anim-flotar2 { animation: flotar2 11s ease-in-out infinite; }
.anim-pulso { animation: pulso 5s ease-in-out infinite; }

.hero {
  background: linear-gradient(160deg, var(--lk-color-dark-base) 55%, var(--lk-color-dark-container) 135%);
  color: var(--lk-color-dark-text); padding: var(--lk-space-20) 0; border-radius: 0 0 var(--lk-radius-hero) var(--lk-radius-hero);
  position: relative; overflow: hidden;
}

/* ——— rama de Kiri: una sola aparición en el hero, al fondo ——— */
.rama-kiri {
  position: absolute; left: -1.5rem; bottom: -2rem; z-index: 1;
  width: min(46vw, 430px); height: auto; pointer-events: none;
  color: var(--lk-color-dark-brand);
}
.rama-kiri .trazo { stroke-opacity: 0.18; fill-opacity: 0.18; }
.rama-kiri .nodo-acento { stroke: var(--lk-color-accent); stroke-opacity: 0.45; }
.rama-kiri path {
  stroke-dasharray: 1; stroke-dashoffset: 1;
  animation: rama-crece 1.4s var(--lk-motion-ease) 0.2s forwards;
}
@keyframes rama-crece { to { stroke-dashoffset: 0; } }
.hero h1 {
  font-family: var(--lk-font-display); font-weight: var(--lk-type-display-weight);
  font-size: var(--lk-type-display-size); line-height: var(--lk-type-display-lineHeight);
  letter-spacing: var(--lk-type-display-tracking); max-width: 24ch; color: var(--lk-color-dark-text);
}
.hero p.lead { margin-top: var(--lk-space-5); font-size: var(--lk-type-lead-size); line-height: var(--lk-type-lead-lineHeight); color: var(--lk-color-dark-textMuted); max-width: 60ch; }
.hero .acciones { margin-top: 2.25rem; display: flex; gap: 0.85rem; flex-wrap: wrap; }

.boton {
  display: inline-block; padding: var(--lk-space-3) var(--lk-space-8); border-radius: var(--lk-radius-pill);
  background: var(--lk-color-action); color: var(--lk-color-brandContrast); font-weight: 600;
  border: 1px solid var(--lk-color-action);
  transition: background var(--lk-motion-fast) var(--lk-motion-ease),
    border-color var(--lk-motion-fast) var(--lk-motion-ease),
    transform var(--lk-motion-fast) var(--lk-motion-ease);
}
.boton:hover { text-decoration: none; background: var(--lk-color-actionHover); border-color: var(--lk-color-actionHover); transform: translateY(-1px); }
.boton:active { background: var(--lk-color-actionActive); border-color: var(--lk-color-actionActive); transform: translateY(0); }
.boton:disabled, .boton[aria-disabled='true'] {
  background: var(--lk-color-surfaceSunken); border-color: var(--lk-color-border);
  color: var(--lk-color-textMuted); cursor: not-allowed; transform: none;
}
.boton.secundario { background: transparent; color: inherit; border-color: currentColor; opacity: 0.9; }
.boton.secundario:hover { background: transparent; border-color: var(--lk-color-dark-brand); color: var(--lk-color-dark-text); opacity: 1; }
.boton.secundario:active { background: transparent; border-color: var(--lk-color-dark-brand); }

/* ——— zonas claras: alternancia de fondos planos, sin texturas ——— */
section.bloque { padding: 4.25rem 0; position: relative; }
section.bloque > .container { position: relative; z-index: 1; }
section.bloque.alterno { background: var(--lk-color-surfaceSunken); }
section.bloque h2 {
  font-family: var(--lk-font-display); font-weight: var(--lk-type-h2-weight);
  font-size: var(--lk-type-h2-size); line-height: var(--lk-type-h2-lineHeight);
  letter-spacing: var(--lk-type-h2-tracking); margin-bottom: var(--lk-space-3); color: var(--lk-color-dark-base);
}
/* barra de acento bajo cada título */
section.bloque h2::after {
  content: ''; display: block; width: 54px; height: 4px; border-radius: var(--lk-radius-pill);
  background: linear-gradient(90deg, var(--lk-color-brand), var(--lk-color-accent)); margin-top: 0.6rem;
}
section.bloque > .container > p.intro { color: var(--lk-color-textMuted); max-width: 65ch; margin-bottom: var(--lk-space-8); }

.tarjetas { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--lk-space-6); margin-top: var(--lk-space-6); }
.tarjeta {
  background: var(--lk-color-surface); border: 1px solid var(--lk-color-border); border-radius: var(--lk-radius-lg); padding: var(--lk-space-6);
  box-shadow: var(--lk-shadow-1);
  transition: transform var(--lk-motion-base) var(--lk-motion-ease),
    box-shadow var(--lk-motion-base) var(--lk-motion-ease),
    border-color var(--lk-motion-base) var(--lk-motion-ease);
  position: relative; overflow: hidden;
}
/* filo superior verde al pasar el mouse (un solo acento: sin degradado, §9) */
.tarjeta::before {
  content: ''; position: absolute; left: 0; top: 0; height: 4px; width: 100%;
  background: var(--lk-color-brand);
  transform: scaleX(0); transform-origin: left; transition: transform var(--lk-motion-base) var(--lk-motion-ease);
}
.tarjeta:hover { transform: translateY(-4px); box-shadow: var(--lk-shadow-2); border-color: transparent; }
.tarjeta:hover::before { transform: scaleX(1); }
.tarjeta h3, .servicio h3, .paso h3 {
  font-family: var(--lk-font-display); font-weight: var(--lk-type-h3-weight);
  font-size: var(--lk-type-h3-size); line-height: var(--lk-type-h3-lineHeight);
  letter-spacing: var(--lk-type-h3-tracking); margin-bottom: var(--lk-space-2); color: var(--lk-color-dark-base);
}
.tarjeta p { color: var(--lk-color-textSecondary); font-size: var(--lk-type-body-size); }

/* ——— servicios (Qué hacemos): lista editorial asimétrica, §9.2 ——— */
.servicios { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--lk-space-6); margin-top: var(--lk-space-6); }
.servicio { padding-top: var(--lk-space-6); border-top: 2px solid var(--lk-color-border); }
.etiqueta-tec {
  font-family: var(--lk-font-mono); font-size: var(--lk-type-caption-size); font-weight: 600;
  letter-spacing: 0.08em; color: var(--lk-color-brandText);
}
.servicio h3 { margin: var(--lk-space-2) 0; }
.servicio p { color: var(--lk-color-textSecondary); }
/* el ítem destacado es la única señal dorada de la sección (§9.4) */
.servicio.destacado {
  grid-column: 1 / -1; border-top: none;
  background: var(--lk-color-accentTint); border-radius: var(--lk-radius-lg); padding: var(--lk-space-6);
}
.servicio.destacado .etiqueta-tec { color: var(--lk-color-accentText); }

/* ——— pipeline (Cómo trabajamos): la única sección numerada, §9.1 ——— */
.pipeline { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--lk-space-6); margin-top: var(--lk-space-8); }
.paso { position: relative; }
/* segmento conector entre nodos, misma familia de trazo que la rama Kiri */
.paso::after {
  content: ''; position: absolute; top: 14px; left: 44px; right: calc(-1 * var(--lk-space-6));
  height: 2px; background: var(--lk-color-border);
}
.paso:last-child::after { display: none; }
.paso .nodo {
  position: relative; z-index: 1; width: 28px; height: 28px; border-radius: 50%;
  border: 1.5px solid var(--lk-color-brand); background: var(--lk-color-surface);
  color: var(--lk-color-brandText); font-family: var(--lk-font-mono);
  font-size: var(--lk-type-caption-size); font-weight: 600;
  display: flex; align-items: center; justify-content: center;
}
/* el proceso termina en acompañamiento: nodo final en dorado, la señal única */
.paso:last-child .nodo { border-color: var(--lk-color-accent); color: var(--lk-color-accentText); }
.paso h3 { margin-top: var(--lk-space-4); }
.paso p { color: var(--lk-color-textSecondary); }
.acciones.al-final { margin-top: var(--lk-space-10); }

.persona .avatar {
  width: 64px; height: 64px; border-radius: 50%;
  background: linear-gradient(135deg, var(--lk-color-brand), var(--lk-color-dark-container));
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 1.3rem; margin-bottom: var(--lk-space-4);
}
.persona .rol { color: var(--lk-color-brandText); font-size: var(--lk-type-caption-size); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }

.prosa { max-width: 72ch; }
.prosa h1 {
  font-family: var(--lk-font-display); font-weight: var(--lk-type-h1-weight);
  font-size: var(--lk-type-h1-size); line-height: var(--lk-type-h1-lineHeight);
  letter-spacing: var(--lk-type-h1-tracking); color: var(--lk-color-dark-base);
}
.prosa h2 {
  font-family: var(--lk-font-display); font-weight: var(--lk-type-h3-weight);
  font-size: var(--lk-type-h3-size); line-height: var(--lk-type-h3-lineHeight);
  letter-spacing: var(--lk-type-h3-tracking); margin: var(--lk-space-8) 0 var(--lk-space-3); color: var(--lk-color-dark-base);
}
.prosa p, .prosa li { color: var(--lk-color-text); margin-bottom: var(--lk-space-3); }
.prosa ul, .prosa ol { padding-left: var(--lk-space-6); margin-bottom: var(--lk-space-4); }
.prosa .fecha { color: var(--lk-color-textMuted); font-size: 0.9rem; }
.lista-check { list-style: none; padding-left: 0; }
.lista-check li { padding-left: 1.75rem; position: relative; margin-bottom: 0.6rem; }
.lista-check li::before { content: '✓'; position: absolute; left: 0; color: var(--lk-color-brand); font-weight: 700; }

/* ——— revelado al hacer scroll (progresivo: sin JS, se ve igual) ——— */
.reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.6s ease, transform 0.6s ease; }
.reveal.visible { opacity: 1; transform: none; }

footer.site {
  background: var(--lk-color-dark-base); color: #aab6c0; padding: var(--lk-space-12) 0 var(--lk-space-10); margin-top: var(--lk-space-12);
  border-radius: var(--lk-radius-hero) var(--lk-radius-hero) 0 0; position: relative; overflow: hidden;
}
footer.site .container { display: flex; justify-content: space-between; gap: var(--lk-space-6); flex-wrap: wrap; font-size: 0.9rem; align-items: flex-start; position: relative; z-index: 2; }
footer.site nav { display: flex; gap: var(--lk-space-5); flex-wrap: wrap; }
footer.site a { color: var(--lk-color-dark-textSecondary); }
footer.site a:hover { color: #fff; }
footer.site .marca-pie img { height: 84px; display: block; margin-bottom: 0.9rem; filter: drop-shadow(0 6px 12px rgba(0,0,0,0.4)); }

[data-likekiri-island] { min-height: var(--lk-space-16); }
.isla-cargando, .isla-error {
  border: 1px dashed var(--lk-color-border); border-radius: 14px;
  padding: var(--lk-space-5); color: var(--lk-color-textMuted); font-size: 0.95rem;
}
.isla-error { border-color: var(--lk-color-danger); color: var(--lk-color-danger); }

.pagina-error { padding: var(--lk-space-24) 0; text-align: center; }
.pagina-error h1 {
  font-family: var(--lk-font-display); font-weight: var(--lk-type-display-weight);
  font-size: var(--lk-type-display-size); line-height: var(--lk-type-display-lineHeight);
  letter-spacing: var(--lk-type-display-tracking); color: var(--lk-color-dark-base);
}
.pagina-error p { color: var(--lk-color-textMuted); margin-top: var(--lk-space-3); }

/* ——— responsivo ——— */
@media (max-width: 900px) {
  /* apilado, el header dejaría poco viewport si siguiera fijo */
  header.site { position: static; height: auto; padding: var(--lk-space-3) 0; }
  header.site .container { flex-direction: column; gap: var(--lk-space-3); }
  nav.main { justify-content: center; row-gap: var(--lk-space-2); }
  .brand img { height: 52px; }
  .servicios { grid-template-columns: 1fr; }
  /* pipeline vertical: nodo a la izquierda, línea conectora hacia abajo */
  .pipeline { grid-template-columns: 1fr; }
  .paso { padding-left: var(--lk-space-10); }
  .paso .nodo { position: absolute; left: 0; top: 0; }
  .paso h3 { margin-top: 0; }
  .paso::after { left: 13px; top: 34px; bottom: calc(-1 * var(--lk-space-6)); width: 2px; height: auto; right: auto; }
}
@media (max-width: 600px) {
  .hero { padding: var(--lk-space-12) 0; border-radius: 0 0 var(--lk-radius-xl) var(--lk-radius-xl); }
  section.bloque { padding: var(--lk-space-10) 0; }
  .hero .acciones { flex-direction: column; align-items: stretch; }
  .hero .acciones .boton { text-align: center; }
  .rama-kiri { width: min(70vw, 280px); }
  footer.site { border-radius: var(--lk-radius-xl) var(--lk-radius-xl) 0 0; }
  footer.site .container { flex-direction: column; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
  .reveal { opacity: 1; transform: none; }
  /* sin animación, la rama debe mostrarse ya dibujada (dashoffset 1 la ocultaría) */
  .rama-kiri path { stroke-dasharray: none; stroke-dashoffset: 0; }
}
`;
