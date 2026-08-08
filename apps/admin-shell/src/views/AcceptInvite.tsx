import { useEffect, useState, type FormEvent, type ReactElement } from 'react';

import { api, ApiError } from '../api';
import { Link } from '../router';

type Estado =
  | { fase: 'cargando' }
  | { fase: 'invalida'; mensaje: string }
  | { fase: 'formulario'; email: string }
  | { fase: 'lista'; email: string };

export function AcceptInvite(): ReactElement {
  const token = new URLSearchParams(window.location.search).get('token') ?? '';
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (token === '') {
      setEstado({ fase: 'invalida', mensaje: 'falta el token de invitación' });
      return;
    }
    api
      .invitationPeek(token)
      .then(({ email }) => setEstado({ fase: 'formulario', email }))
      .catch((err: unknown) =>
        setEstado({
          fase: 'invalida',
          mensaje: err instanceof ApiError ? err.message : 'la invitación no es válida',
        }),
      );
  }, [token]);

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (estado.fase !== 'formulario') return;
    if (password !== confirm) {
      setError('las contraseñas no coinciden');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.acceptInvite(token, password);
      setEstado({ fase: 'lista', email: estado.email });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'no se pudo completar el registro');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="centrado">
      <div className="tarjeta-login">
        <div className="marca">
          Like<span>Kiri</span> admin
        </div>
        {estado.fase === 'cargando' && <p className="muted">Comprobando invitación…</p>}
        {estado.fase === 'invalida' && (
          <>
            <p className="error">{estado.mensaje}</p>
            <p className="muted" style={{ marginTop: '1rem' }}>
              Pide a quien te invitó que genere un enlace nuevo.
            </p>
          </>
        )}
        {estado.fase === 'formulario' && (
          <form className="apilada" onSubmit={(e) => void submit(e)}>
            <p className="muted">
              Crea tu contraseña para <strong>{estado.email}</strong>. Mínimo 12
              caracteres; una frase larga funciona mejor que símbolos rebuscados.
            </p>
            <div>
              <label htmlFor="password">Contraseña nueva</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={12}
                required
              />
            </div>
            <div>
              <label htmlFor="confirm">Repite la contraseña</label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={12}
                required
              />
            </div>
            {error !== null && <div className="error">{error}</div>}
            <button className="boton" type="submit" disabled={busy}>
              {busy ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>
        )}
        {estado.fase === 'lista' && (
          <>
            <p>
              Cuenta creada para <strong>{estado.email}</strong>. El enlace de
              invitación quedó inutilizado.
            </p>
            <p style={{ marginTop: '1rem' }}>
              <Link className="boton" to="/login">
                Ir a iniciar sesión
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
