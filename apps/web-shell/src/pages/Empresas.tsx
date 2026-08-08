import type { ReactElement } from 'react';

export function Empresas(): ReactElement {
  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>Para organizaciones que mueven datos sensibles</h1>
          <p className="lead">
            Ayudamos a bancos, aseguradoras, estudios jurídicos, clínicas y
            empresas de servicios a automatizar operaciones completas: desde el
            proceso batch que concilia cuentas cada noche hasta el asistente que
            responde con la política interna vigente. Con los controles de
            seguridad que tu área de riesgo va a pedir de todos modos.
          </p>
          <div className="acciones">
            <a className="boton" href="/contacto">
              Hablemos de tu operación
            </a>
          </div>
        </div>
      </section>

      <section className="bloque alterno">
        <div className="container">
          <h2>Servicios</h2>
          <div className="tarjetas">
            <div className="tarjeta">
              <h3>Diagnóstico de procesos</h3>
              <p>
                Levantamiento de tu operación con tu gente, mapa de
                automatización priorizado por impacto y costo, y un plan por
                etapas que tu directorio pueda leer.
              </p>
            </div>
            <div className="tarjeta">
              <h3>RPA a escala</h3>
              <p>
                Flotas de robots con orquestación, reintentos, trazabilidad y
                alertas. No scripts sueltos en el computador de alguien que ya
                no trabaja aquí.
              </p>
            </div>
            <div className="tarjeta">
              <h3>Integraciones batch</h3>
              <p>
                Cargas y sincronizaciones entre core bancario, ERP y sistemas
                legados, con validación de datos y reproceso controlado.
              </p>
            </div>
            <div className="tarjeta">
              <h3>RAG corporativo</h3>
              <p>
                Buscadores y asistentes conectados a tu documentación viva:
                normativa interna, contratos, actas. Cada respuesta cita su
                fuente y respeta los permisos de quien pregunta.
              </p>
            </div>
            <div className="tarjeta">
              <h3>LLM on-premise</h3>
              <p>
                Modelos de lenguaje propios, ajustados a tu dominio, desplegados
                en tu datacenter o nube privada. Precisión alta en lo tuyo,
                consumo bajo, y ningún dato cruzando la frontera de tu red.
              </p>
            </div>
            <div className="tarjeta">
              <h3>Soporte y evolución</h3>
              <p>
                Acuerdos de nivel de servicio, monitoreo continuo y mejoras
                incrementales. Lo automatizado se mantiene, no se abandona.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bloque">
        <div className="container">
          <h2>Seguridad y cumplimiento desde el diseño</h2>
          <div className="prosa">
            <ul className="lista-check">
              <li>
                Los datos se procesan donde tú decidas: on-premise o en tu nube
                privada. Los proyectos con información regulada no usan APIs
                públicas de IA.
              </li>
              <li>
                Trabajamos junto a tus áreas legales y de seguridad desde el
                primer día, no cuando el proyecto ya está hecho.
              </li>
              <li>
                Registro de auditoría de cada acción automatizada: qué se hizo,
                cuándo, con qué datos y por decisión de quién.
              </li>
              <li>
                Acuerdos de confidencialidad y de tratamiento de datos como
                parte estándar del contrato, no como anexo negociado.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
