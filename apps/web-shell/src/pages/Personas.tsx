import type { ReactElement } from 'react';

export function Personas(): ReactElement {
  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>Para profesionales y equipos pequeños</h1>
          <p className="lead">
            No hace falta ser una gran empresa para dejar de perder horas en
            tareas repetitivas. Si ejerces una profesión independiente o llevas
            un equipo pequeño, hay versiones a tu escala de lo mismo que hacemos
            para organizaciones grandes.
          </p>
        </div>
      </section>

      <section className="bloque alterno">
        <div className="container">
          <h2>Qué podemos automatizar contigo</h2>
          <div className="tarjetas">
            <div className="tarjeta">
              <h3>Tu papeleo recurrente</h3>
              <p>
                Informes que armas todos los meses, correos que respondes con la
                misma estructura, datos que copias de un sistema a otro. Se
                automatiza una vez y corre solo.
              </p>
            </div>
            <div className="tarjeta">
              <h3>Un asistente con tus documentos</h3>
              <p>
                Tus contratos, fichas o expedientes, consultables en lenguaje
                natural. Se despliega donde prefieras y, si tu información es
                delicada, puede correr en tu propio equipo sin subir nada a
                servicios de terceros.
              </p>
            </div>
            <div className="tarjeta">
              <h3>Capacitación honesta</h3>
              <p>
                Sesiones prácticas para que entiendas qué puede y qué no puede
                hacer la IA en tu trabajo, y uses estas herramientas sin poner en
                riesgo la información que te confiaron.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bloque">
        <div className="container">
          <h2>Empezar es más simple de lo que crees</h2>
          <div className="prosa">
            <ul className="lista-check">
              <li>Una reunión de una hora para entender tu día a día.</li>
              <li>Te proponemos una sola automatización, la de mayor impacto.</li>
              <li>Precio cerrado, sin suscripciones confusas.</li>
              <li>
                Si tu caso necesita algo que no hacemos, te lo decimos y te
                orientamos hacia quien sí.
              </li>
            </ul>
          </div>
          <div className="acciones al-final">
            <a className="boton" href="/contacto">
              Cuéntanos tu caso
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
