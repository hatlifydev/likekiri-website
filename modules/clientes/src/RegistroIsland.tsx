import { useState, type CSSProperties, type FormEvent, type ReactElement } from 'react';

import { api, ApiError } from './api';
import { PLANES, PLANES_POR_TIPO, TIPOS, formatoCLP, type PlanId, type TipoCuenta } from './planes';

/** Isla pública: alta de una cuenta de cliente con elección de plan. */
export function RegistroIsland(): ReactElement {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tipo, setTipo] = useState<TipoCuenta>('persona');
  const [plan, setPlan] = useState<PlanId>('gratis');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [creada, setCreada] = useState(false);

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.registro({ nombre, email, password, plan, tipo });
      setCreada(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'no se pudo crear la cuenta');
    } finally {
      setBusy(false);
    }
  };

  if (creada) {
    return (
      <section style={{ maxWidth: '30rem' }}>
        <h1>Cuenta creada</h1>
        <p style={{ color: 'var(--lk-color-textMuted)', margin: '0.75rem 0 1.5rem' }}>
          Ya tienes acceso al portal de clientes con el plan elegido.
        </p>
        <a className="boton" href="/clientes/portal">
          Ir a mi portal
        </a>
      </section>
    );
  }

  return (
    <section style={{ maxWidth: '34rem' }}>
      <h1 style={{ letterSpacing: '-0.02em' }}>Crea tu cuenta</h1>
      <p style={{ color: 'var(--lk-color-textMuted)', margin: '0.5rem 0 1.5rem' }}>
        Elige un plan (puedes cambiarlo cuando quieras) y define tu contraseña.
      </p>
      <form onSubmit={(e) => void submit(e)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label>
          Nombre
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            minLength={2}
            style={campo}
          />
        </label>
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
          Contraseña (mínimo 12 caracteres)
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={12}
            style={campo}
          />
        </label>

        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ marginBottom: '0.5rem' }}>Tipo de cuenta</legend>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            {TIPOS.map((opcion) => (
              <label
                key={opcion.id}
                style={{
                  border: `1px solid ${tipo === opcion.id ? 'var(--lk-color-brand)' : 'var(--lk-color-border)'}`,
                  borderRadius: 'var(--lk-radius-md)',
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="tipo"
                  checked={tipo === opcion.id}
                  onChange={() => {
                    setTipo(opcion.id);
                    const sugeridos = PLANES_POR_TIPO[opcion.id];
                    if (!sugeridos.includes(plan)) setPlan(sugeridos[0] ?? 'gratis');
                  }}
                  style={{ marginRight: '0.5rem' }}
                />
                <strong>{opcion.nombre}</strong>
                <div style={{ color: 'var(--lk-color-textMuted)', fontSize: '0.88rem' }}>
                  {opcion.descripcion}
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ marginBottom: '0.5rem' }}>Plan</legend>
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {PLANES.filter((p) => PLANES_POR_TIPO[tipo].includes(p.id)).map((opcion) => (
              <label
                key={opcion.id}
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'flex-start',
                  border: `1px solid ${plan === opcion.id ? 'var(--lk-color-brand)' : 'var(--lk-color-border)'}`,
                  borderRadius: 'var(--lk-radius-md)',
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="plan"
                  checked={plan === opcion.id}
                  onChange={() => setPlan(opcion.id)}
                  style={{ marginTop: '0.3rem' }}
                />
                <span>
                  <strong>{opcion.nombre}</strong>{' '}
                  <span style={{ color: 'var(--lk-color-brand)' }}>{formatoCLP(opcion.precio)}</span>
                  <br />
                  <span style={{ color: 'var(--lk-color-textMuted)', fontSize: '0.92rem' }}>
                    {opcion.descripcion}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {error !== null && <div style={{ color: 'var(--lk-color-danger)' }}>{error}</div>}
        <div>
          <button className="boton" type="submit" disabled={busy}>
            {busy ? 'Creando…' : 'Crear cuenta'}
          </button>
        </div>
        <p style={{ color: 'var(--lk-color-textMuted)', fontSize: '0.92rem' }}>
          ¿Ya tienes cuenta? <a href="/clientes/acceso">Inicia sesión</a>.
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
