import type { ReactElement } from 'react';

interface Miembro {
  nombre: string;
  rol: string;
  bio: string;
  iniciales: string;
}

const equipo: Miembro[] = [
  {
    nombre: 'Pedro Miguras',
    rol: 'Socio fundador · Dirección de tecnología',
    bio: 'Ingeniero de software con veinte años construyendo sistemas para banca y salud. Dirige la arquitectura de los proyectos y el desarrollo de los modelos de lenguaje propios de LikeKiri.',
    iniciales: 'PM',
  },
  {
    nombre: 'Germán Alvarez',
    rol: 'Socio · Dirección de consultoría',
    bio: 'Especialista en rediseño de procesos y gestión del cambio. Antes de LikeKiri lideró la oficina de automatización de una aseguradora regional. Traduce problemas de negocio a proyectos que se pueden ejecutar.',
    iniciales: 'GA',
  },
  {
    nombre: 'Camila Reyes',
    rol: 'Ingeniería de datos',
    bio: 'Construye los pipelines que alimentan cada automatización: integraciones batch, calidad de datos y observabilidad. Convencida de que un modelo vale lo que valen sus datos.',
    iniciales: 'CR',
  },
  {
    nombre: 'Ignacio Fuentes',
    rol: 'Consultor RPA senior',
    bio: 'Ha desplegado flotas de robots en retail y servicios financieros. Le gusta automatizar lo aburrido y documentarlo tan bien que cualquiera pueda mantenerlo después.',
    iniciales: 'IF',
  },
  {
    nombre: 'Valentina Soto',
    rol: 'Cumplimiento y protección de datos',
    bio: 'Abogada especializada en privacidad y regulación sectorial. Revisa cada proyecto desde el diseño para que la seguridad jurídica no sea una reflexión tardía.',
    iniciales: 'VS',
  },
];

export function Equipo(): ReactElement {
  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>El equipo</h1>
          <p className="lead">
            Somos un equipo pequeño a propósito: la gente que diseña tu
            solución es la misma que la construye y la misma que contesta
            cuando algo falla.
          </p>
        </div>
      </section>

      <section className="bloque alterno">
        <div className="container">
          <div className="tarjetas">
            {equipo.map((miembro) => (
              <div className="tarjeta persona" key={miembro.nombre}>
                <div className="avatar" aria-hidden="true">
                  {miembro.iniciales}
                </div>
                <h3>{miembro.nombre}</h3>
                <div className="rol">{miembro.rol}</div>
                <p style={{ marginTop: '0.6rem' }}>{miembro.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
