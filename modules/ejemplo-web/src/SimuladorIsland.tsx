import { useMemo, useState, type ReactElement } from 'react';

/**
 * Isla de ejemplo de la superficie web.
 *
 * Reglas de una isla:
 *  - Recibe como props los :params de su ruta (/ejemplo-web/:modo → { modo }).
 *  - Corre SOLO en el navegador: el core emite un placeholder en el SSR y este
 *    componente se monta al hidratar. Nada de APIs de Node aquí.
 *  - Debe renderizar algo útil sin datos externos (si haces fetch, muestra tu
 *    propio estado de carga).
 */
export interface SimuladorIslandProps {
  modo: string;
}

const HORAS_LABORALES_ANIO = 46 * 44; // 46 semanas × 44 h

export function SimuladorIsland({ modo }: SimuladorIslandProps): ReactElement {
  const [personas, setPersonas] = useState(3);
  const [horasSemana, setHorasSemana] = useState(6);

  const resultado = useMemo(() => {
    // Supuesto conservador: un 70% de la tarea repetitiva es automatizable.
    const horasAnio = Math.round(personas * horasSemana * 46 * 0.7);
    const jornadas = Math.round(horasAnio / 8);
    const porcentaje = Math.min(100, Math.round((horasAnio / (personas * HORAS_LABORALES_ANIO)) * 100));
    return { horasAnio, jornadas, porcentaje };
  }, [personas, horasSemana]);

  return (
    <section style={{ maxWidth: '34rem' }}>
      <h1 style={{ letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
        ¿Cuánto tiempo recuperarías?
      </h1>
      <p style={{ color: 'var(--lk-color-textMuted)', marginBottom: '1.5rem' }}>
        Mueve los controles y mira el efecto de automatizar la parte repetitiva
        del trabajo de tu equipo{modo !== 'demo' ? ` (escenario: ${modo})` : ''}.
      </p>

      <label style={{ display: 'block', marginBottom: '1rem' }}>
        Personas que hacen la tarea: <strong>{personas}</strong>
        <input
          type="range"
          min={1}
          max={20}
          value={personas}
          onChange={(e) => setPersonas(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </label>

      <label style={{ display: 'block', marginBottom: '1.5rem' }}>
        Horas por persona a la semana: <strong>{horasSemana} h</strong>
        <input
          type="range"
          min={1}
          max={20}
          value={horasSemana}
          onChange={(e) => setHorasSemana(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </label>

      <div
        style={{
          border: '1px solid var(--lk-color-border)',
          borderRadius: 'var(--lk-radius-lg)',
          padding: '1.25rem 1.5rem',
          background: 'var(--lk-color-surface)',
        }}
      >
        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--lk-color-brand)' }}>
          ≈ {resultado.horasAnio.toLocaleString('es-CL')} horas al año
        </div>
        <p style={{ color: 'var(--lk-color-textMuted)', marginTop: '0.25rem' }}>
          Eso son unas <strong>{resultado.jornadas} jornadas completas</strong> — un{' '}
          {resultado.porcentaje}% del tiempo de ese equipo — que vuelven a tareas
          que sí necesitan a un humano.
        </p>
      </div>

      <p style={{ marginTop: '1.5rem' }}>
        <a className="boton" href="/contacto">
          Conversemos tu caso
        </a>
      </p>
    </section>
  );
}
