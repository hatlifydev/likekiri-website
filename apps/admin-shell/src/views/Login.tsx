import { useState, type FormEvent, type ReactElement } from 'react';

import { api, ApiError } from '../api';

export function Login({ onLogin }: { onLogin: () => void }): ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.login(email, password);
      onLogin();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'no se pudo iniciar sesión');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="centrado">
      <div className="tarjeta-login">
        <div className="marca">
          <img src="/admin-assets/marca.png" alt="" />
          Like<span>Kiri</span>&nbsp;admin
        </div>
        <form className="apilada" onSubmit={(e) => void submit(e)}>
          <div>
            <label htmlFor="email">Correo</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error !== null && <div className="error">{error}</div>}
          <button className="boton" type="submit" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
