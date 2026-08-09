import { useState, type FormEvent, type ReactElement } from 'react';

import { api, ApiError } from './api';

export function PasswordPage(): ReactElement {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (next !== confirm) {
      setError('las contraseñas nuevas no coinciden');
      return;
    }
    setBusy(true);
    setError(null);
    setOk(false);
    try {
      await api.changePassword(current, next);
      setOk(true);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'no se pudo cambiar la contraseña');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1>Mi contraseña</h1>
      <div className="panel">
        <form className="apilada" onSubmit={(e) => void submit(e)}>
          <div>
            <label htmlFor="actual">Contraseña actual</label>
            <input
              id="actual"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="nueva">Contraseña nueva (mínimo 12 caracteres)</label>
            <input
              id="nueva"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              minLength={12}
              required
            />
          </div>
          <div>
            <label htmlFor="confirmar">Repite la contraseña nueva</label>
            <input
              id="confirmar"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={12}
              required
            />
          </div>
          {error !== null && <div className="error">{error}</div>}
          {ok && (
            <div className="aviso">
              Contraseña actualizada. Tus otras sesiones quedaron cerradas.
            </div>
          )}
          <button className="boton" type="submit" disabled={busy}>
            {busy ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
    </>
  );
}
