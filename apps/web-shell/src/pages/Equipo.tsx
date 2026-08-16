import type { ReactElement } from 'react';

import type { PageContext } from './index';

/**
 * Equipo server-driven: las fichas vienen del core (usuarios con enEquipo=true,
 * editables desde el admin). Si el back no envía nadie, se muestran unos
 * valores por defecto para que la página nunca quede vacía.
 */
const POR_DEFECTO = [
  {
    displayName: 'Pedro Miguras',
    title: 'Socio fundador · Dirección de tecnología',
    bio: 'Ingeniero de software con veinte años construyendo sistemas en producción. Dirige la arquitectura y la construcción de los proyectos de LikeKiri.',
    initials: 'PM',
  },
];

export function Equipo({ team }: PageContext): ReactElement {
  const miembros = team.length > 0 ? team : POR_DEFECTO;
  return (
    <>
      <section className="hero franja-oscura">
        <div className="container">
          <h1>El equipo</h1>
          <p className="lead">
            Somos un equipo pequeño a propósito: la gente que diseña tu solución
            es la misma que la construye y la misma que contesta cuando algo falla.
          </p>
        </div>
      </section>

      <section className="bloque alterno">
        <div className="container">
          <div className="tarjetas">
            {miembros.map((miembro) => (
              <div className="tarjeta persona reveal" key={miembro.displayName}>
                <div className="avatar" aria-hidden="true">
                  {miembro.initials}
                </div>
                <h3>{miembro.displayName}</h3>
                {miembro.title !== '' && <div className="rol">{miembro.title}</div>}
                {miembro.bio !== '' && <p style={{ marginTop: '0.6rem' }}>{miembro.bio}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
