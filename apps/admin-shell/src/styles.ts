import { cssVariables } from '@likekiri/tokens';

export const adminCss = `
:root { ${cssVariables()} }
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
  width: 230px; flex-shrink: 0; background: #10221f; color: #e6efed;
  display: flex; flex-direction: column; padding: 1.25rem 0;
}
.sidebar .marca { font-weight: 700; font-size: 1.15rem; padding: 0 1.25rem 1.25rem; color: #fff; }
.sidebar .marca span { color: #5eead4; }
.sidebar nav { display: flex; flex-direction: column; gap: 2px; }
.sidebar nav a {
  color: #b8c8c5; padding: 0.55rem 1.25rem; font-size: 0.95rem; border-left: 3px solid transparent;
}
.sidebar nav a:hover { color: #fff; }
.sidebar nav a.activo { color: #fff; border-left-color: #5eead4; background: rgba(255,255,255,0.06); }
.sidebar .abajo { margin-top: auto; padding: 1rem 1.25rem 0; font-size: 0.85rem; color: #8aa19d; }
.sidebar .abajo button {
  margin-top: 0.5rem; width: 100%; background: transparent; color: #b8c8c5;
  border: 1px solid #33504b; border-radius: 6px; padding: 0.45rem;
}
.sidebar .abajo button:hover { color: #fff; border-color: #5eead4; }

.contenido { flex: 1; padding: 2rem 2.5rem; max-width: 1100px; }
.contenido h1 { font-size: 1.5rem; letter-spacing: -0.02em; margin-bottom: 1.25rem; }

.panel {
  background: var(--lk-color-background); border: 1px solid var(--lk-color-border);
  border-radius: var(--lk-radius-lg); padding: 1.5rem; margin-bottom: 1.5rem;
}
.panel h2 { font-size: 1.05rem; margin-bottom: 1rem; }

table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
th { text-align: left; color: var(--lk-color-textMuted); font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; }
th, td { padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--lk-color-border); }
tr:last-child td { border-bottom: none; }

.chip { display: inline-block; padding: 0.1rem 0.6rem; border-radius: 999px; font-size: 0.78rem; font-weight: 600; }
.chip.ok { background: #d1fae5; color: #065f46; }
.chip.mal { background: #fee2e2; color: #991b1b; }
.chip.neutro { background: #e5e7eb; color: #374151; }

form.apilada { display: flex; flex-direction: column; gap: 0.9rem; max-width: 380px; }
label { font-size: 0.85rem; font-weight: 600; color: var(--lk-color-textMuted); display: block; margin-bottom: 0.25rem; }
input, select {
  width: 100%; padding: 0.55rem 0.7rem; border: 1px solid var(--lk-color-border);
  border-radius: var(--lk-radius-md); font: inherit; background: var(--lk-color-background);
}
input:focus, select:focus { outline: 2px solid var(--lk-color-brand); outline-offset: -1px; border-color: var(--lk-color-brand); }

.boton {
  display: inline-block; padding: 0.55rem 1.1rem; border-radius: var(--lk-radius-md);
  background: var(--lk-color-brand); color: var(--lk-color-brandContrast);
  font-weight: 600; border: 1px solid var(--lk-color-brand);
}
.boton:disabled { opacity: 0.6; cursor: default; }
.boton.suave { background: transparent; color: var(--lk-color-brand); }
.boton.peligro { background: transparent; color: var(--lk-color-danger); border-color: var(--lk-color-danger); }
.boton.mini { padding: 0.25rem 0.6rem; font-size: 0.82rem; }

.error { color: var(--lk-color-danger); font-size: 0.9rem; }
.aviso {
  background: #ecfdf5; border: 1px solid #6ee7b7; color: #065f46;
  border-radius: var(--lk-radius-md); padding: 0.9rem 1rem; font-size: 0.9rem;
  word-break: break-all;
}
.aviso code { font-family: var(--lk-font-mono); font-size: 0.85rem; }

.centrado {
  min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem;
}
.tarjeta-login {
  width: 100%; max-width: 380px; background: var(--lk-color-background);
  border: 1px solid var(--lk-color-border); border-radius: var(--lk-radius-lg); padding: 2rem;
}
.tarjeta-login .marca { font-weight: 700; font-size: 1.3rem; margin-bottom: 1.5rem; }
.tarjeta-login .marca span { color: var(--lk-color-brand); }
.muted { color: var(--lk-color-textMuted); font-size: 0.9rem; }
`;
