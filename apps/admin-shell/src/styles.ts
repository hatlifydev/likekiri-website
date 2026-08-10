import { cssVariables } from '@likekiri/tokens';

/**
 * Estilos del admin, alineados con el front: base CLARA, colores corporativos
 * (verde #2E8B57, naranja #D99B3B), formas redondeadas (píldoras, tarjetas 18px)
 * y una franja OSCURA (#12181F) en el sidebar, como el header/footer del sitio.
 */
export const adminCss = `
:root {
  ${cssVariables()}
  --lk-color-background: #ffffff;
  --lk-color-surface: #f4f6f8;
  --lk-color-text: #1d2630;
  --lk-color-textMuted: #5b6674;
  --lk-color-border: #e2e7ec;
  --lk-color-danger: #b91c1c;
  --lk-dark: #12181f;
}
* { box-sizing: border-box; margin: 0; }
body {
  font-family: var(--lk-font-sans);
  color: var(--lk-color-text);
  background: var(--lk-color-surface);
  line-height: 1.55;
}
a { color: var(--lk-color-brand); text-decoration: none; }
button { font: inherit; cursor: pointer; }

.layout { display: flex; min-height: 100vh; }
.sidebar {
  width: 236px; flex-shrink: 0; background: var(--lk-dark); color: #dfe5ea;
  display: flex; flex-direction: column; padding: 1.25rem 0;
}
.sidebar .marca {
  padding: 0 1.25rem 1.25rem; display: flex; align-items: center; gap: 0.5rem;
}
.sidebar .marca .logo { height: 60px; width: auto; display: block; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3)); }
.sidebar .marca .etiqueta-admin {
  font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;
  color: #12181f; background: var(--lk-color-accent); padding: 0.1rem 0.45rem; border-radius: 999px;
}
.sidebar nav { display: flex; flex-direction: column; gap: 2px; }
.sidebar .grupo { display: flex; flex-direction: column; }
.sidebar .grupo-cabecera {
  display: flex; align-items: center; gap: 0.55rem; width: 100%;
  background: none; border: none; text-align: left; cursor: default;
  font: inherit; font-size: 0.95rem; font-weight: 600; color: #d3dedb;
  padding: 0.55rem 1.25rem;
}
.sidebar button.grupo-cabecera { cursor: pointer; }
.sidebar .grupo-cabecera:hover { color: #fff; }
.sidebar .caret { display: inline-block; width: 0.9em; font-size: 0.75em; color: #7f8a95; }
.sidebar .hijos { display: flex; flex-direction: column; }
.sidebar .hijos a { padding-left: 2.7rem; font-size: 0.92rem; }
.sidebar nav a {
  color: #aab6c0; padding: 0.55rem 1.25rem; font-size: 0.95rem; border-left: 3px solid transparent;
  transition: color 0.15s ease, background 0.15s ease;
}
.sidebar nav a:hover { color: #fff; }
.sidebar nav a.activo { color: #fff; border-left-color: var(--lk-color-brand); background: rgba(46,139,87,0.16); }
.sidebar .abajo { margin-top: auto; padding: 1rem 1.25rem 0; font-size: 0.85rem; color: #8b97a2; }
.sidebar .abajo button {
  margin-top: 0.5rem; width: 100%; background: transparent; color: #aab6c0;
  border: 1px solid #33414d; border-radius: 999px; padding: 0.5rem;
  transition: all 0.15s ease;
}
.sidebar .abajo button:hover { color: #fff; border-color: var(--lk-color-brand); }
.sidebar .idiomas-admin { display: inline-flex; gap: 2px; margin-top: 0.5rem; border: 1px solid #33414d; border-radius: 999px; overflow: hidden; width: auto; }
.sidebar .idiomas-admin button {
  margin: 0; width: auto; flex: 1; border: none; border-radius: 0; background: transparent; color: #aab6c0;
  font-size: 0.78rem; font-weight: 600; padding: 0.3rem 0.7rem;
}
.sidebar .idiomas-admin button.activo { background: var(--lk-color-brand); color: #fff; }

.contenido { flex: 1; padding: 2rem 2.5rem; max-width: 1120px; }
.contenido h1 { font-size: 1.6rem; letter-spacing: -0.02em; margin-bottom: 1.25rem; color: var(--lk-dark); }
.contenido h1::after {
  content: ''; display: block; width: 48px; height: 4px; border-radius: 999px; margin-top: 0.5rem;
  background: linear-gradient(90deg, var(--lk-color-brand), var(--lk-color-accent));
}

.panel {
  background: var(--lk-color-background); border: 1px solid var(--lk-color-border);
  border-radius: 18px; padding: 1.5rem; margin-bottom: 1.5rem;
  box-shadow: 0 2px 10px rgba(18,24,31,0.04);
}
.panel h2 { font-size: 1.05rem; margin-bottom: 1rem; color: var(--lk-dark); }

table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
th { text-align: left; color: var(--lk-color-textMuted); font-weight: 600; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; }
th, td { padding: 0.65rem 0.75rem; border-bottom: 1px solid var(--lk-color-border); vertical-align: top; }
tr:last-child td { border-bottom: none; }

.chip { display: inline-block; padding: 0.12rem 0.65rem; border-radius: 999px; font-size: 0.76rem; font-weight: 600; }
.chip.ok { background: rgba(46,139,87,0.15); color: #1f7a4d; }
.chip.mal { background: rgba(185,28,28,0.12); color: #b91c1c; }
.chip.neutro { background: #eef1f4; color: #4a5561; }

form.apilada { display: flex; flex-direction: column; gap: 0.9rem; max-width: 420px; }
label { font-size: 0.85rem; font-weight: 600; color: var(--lk-color-textMuted); display: block; margin-bottom: 0.25rem; }
input, select, textarea {
  width: 100%; padding: 0.55rem 0.75rem; border: 1px solid var(--lk-color-border);
  border-radius: 10px; font: inherit; background: var(--lk-color-background); color: var(--lk-color-text);
}
input:focus, select:focus, textarea:focus { outline: 2px solid var(--lk-color-brand); outline-offset: -1px; border-color: var(--lk-color-brand); }

.boton {
  display: inline-block; padding: 0.6rem 1.3rem; border-radius: 999px;
  background: var(--lk-color-brand); color: #fff; font-weight: 600; border: 1px solid var(--lk-color-brand);
  transition: transform 0.15s ease, filter 0.15s ease;
}
.boton:hover { filter: brightness(1.08); transform: translateY(-1px); }
.boton:disabled { opacity: 0.6; cursor: default; transform: none; }
.boton.suave { background: transparent; color: var(--lk-color-brand); }
.boton.peligro { background: transparent; color: var(--lk-color-danger); border-color: var(--lk-color-danger); }
.boton.mini { padding: 0.3rem 0.8rem; font-size: 0.82rem; }

.ayuda {
  width: 18px; height: 18px; border-radius: 50%; border: none; cursor: pointer;
  background: var(--lk-color-accent); color: #12181f; font-size: 0.72rem; font-weight: 700;
  display: inline-flex; align-items: center; justify-content: center; line-height: 1;
}
.ayuda:hover { filter: brightness(1.08); }

.error { color: var(--lk-color-danger); font-size: 0.9rem; }
.aviso {
  background: rgba(46,139,87,0.1); border: 1px solid rgba(46,139,87,0.4); color: #1f7a4d;
  border-radius: 12px; padding: 0.9rem 1rem; font-size: 0.9rem; word-break: break-word;
}
.aviso code { font-family: var(--lk-font-mono); font-size: 0.85rem; }

.centrado { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem; background: var(--lk-color-surface); }
.tarjeta-login {
  width: 100%; max-width: 380px; background: var(--lk-color-background);
  border: 1px solid var(--lk-color-border); border-radius: 20px; padding: 2rem;
  box-shadow: 0 12px 40px rgba(18,24,31,0.1);
}
/* franja oscura para que el logo de letras blancas se vea sobre la tarjeta clara */
.tarjeta-login .marca-login {
  background: var(--lk-dark); border-radius: 14px; padding: 1.1rem 1.25rem; margin-bottom: 1.5rem;
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
}
.tarjeta-login .marca-login img { height: 64px; width: auto; display: block; }
.tarjeta-login .marca-login span {
  font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;
  color: #12181f; background: var(--lk-color-accent); padding: 0.1rem 0.45rem; border-radius: 999px; align-self: flex-start;
}
.muted { color: var(--lk-color-textMuted); font-size: 0.9rem; }
`;
