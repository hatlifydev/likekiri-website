import { useState, type CSSProperties, type FormEvent, type ReactElement } from 'react';

import { api, ApiError } from './api';

/** Isla pública: acceso de clientes (sesión propia del módulo, no del admin). */
export function AccesoIsland(): ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.acceso(email, password);
      window.location.href = '/clientes/portal';
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'no se pudo iniciar sesión');
      setBusy(false);
    }
  };

  return (
    <section style={{ maxWidth: '26rem' }}>
      <h1 style={{ letterSpacing: '-0.02em' }}>Portal de clientes</h1>
      <p style={{ color: 'var(--lk-color-textMuted)', margin: '0.5rem 0 1.5rem' }}>
        Accede para ver tu plan y tu facturación.
      </p>
      <form onSubmit={(e) => void submit(e)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label>
          Correo
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={campo}
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={campo}
          />
        </label>
        {error !== null && <div style={{ color: 'var(--lk-color-danger)' }}>{error}</div>}
        <div>
          <button className="boton" type="submit" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </div>
        <p style={{ color: 'var(--lk-color-textMuted)', fontSize: '0.92rem' }}>
          ¿Aún sin cuenta? <a href="/clientes/registro">Regístrate</a>.
        </p>
      </form>
    </section>
  );
}

const campo: CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: '0.3rem',
  padding: '0.55rem 0.7rem',
  border: '1px solid var(--lk-color-border)',
  borderRadius: 'var(--lk-radius-md)',
  font: 'inherit',
};
