import type { ReactElement } from 'react';

export function Contacto(): ReactElement {
  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>Conversemos</h1>
          <p className="lead">
            Cuéntanos qué proceso te está quitando tiempo o qué información
            necesitas consultar sin que salga de tu organización. Respondemos
            dentro de un día hábil.
          </p>
          <div className="acciones">
            <a className="boton" href="mailto:contacto@likekiri.com">
              contacto@likekiri.com
            </a>
          </div>
        </div>
      </section>

      <section className="bloque alterno">
        <div className="container">
          <h2>Qué esperar de la primera reunión</h2>
          <div className="prosa">
            <ul className="lista-check">
              <li>Una videollamada de una hora, sin costo y sin compromiso.</li>
              <li>
                Escuchamos tu caso y te decimos, ahí mismo, si es algo que
                sabemos resolver.
              </li>
              <li>
                Si avanzamos, el siguiente paso es siempre una propuesta escrita
                con alcance y precio cerrados.
              </li>
              <li>
                Si tu información es sensible, firmamos confidencialidad antes
                de que nos muestres nada.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="bloque">
        <div className="container">
          <h2>Preguntas frecuentes</h2>
          <div className="faq">
            <details>
              <summary>¿Cómo es el primer paso?</summary>
              <p>
                Una videollamada de una hora, sin costo y sin compromiso.
                Escuchamos tu caso y te decimos, ahí mismo, si es algo que
                sabemos resolver. Si avanzamos, el siguiente paso es siempre una
                propuesta escrita con alcance y precio cerrados.
              </p>
            </details>
            <details>
              <summary>¿Cuánto cuesta un proyecto?</summary>
              <p>
                Cada proyecto se cotiza en una propuesta escrita con alcance,
                plazo y precio cerrados. Sin suscripciones confusas ni costos
                abiertos: sabes qué recibes y cuánto cuesta antes de
                comprometerte.
              </p>
            </details>
            <details>
              <summary>¿Firman acuerdos de confidencialidad?</summary>
              <p>
                Sí. Si tu información es sensible, firmamos confidencialidad
                antes de que nos muestres nada. En proyectos con información
                regulada lo proponemos nosotros.
              </p>
            </details>
            <details>
              <summary>¿Dónde se despliega lo que construyen?</summary>
              <p>
                Donde tú decidas: tu nube, tus servidores o un VPS. Cuando la
                privacidad exige un circuito cerrado, la solución puede operar
                sin APIs públicas de IA, con los datos sin salir de tu
                organización.
              </p>
            </details>
            <details>
              <summary>¿Trabajan con IA de proveedores o con modelos propios?</summary>
              <p>
                Según el caso: integramos modelos de los grandes proveedores o
                modelos abiertos, con controles sobre qué datos ven. Además
                estamos entrenando modelos propios por dominio; se anunciarán
                cuando estén en producción.
              </p>
            </details>
            <details>
              <summary>¿Qué pasa después de la entrega?</summary>
              <p>
                Los desarrollos tienen noventa días de garantía sobre defectos
                de construcción. El soporte y la evolución posteriores se
                acuerdan por separado, con niveles de servicio explícitos.
              </p>
            </details>
            <details>
              <summary>¿Y si mi caso no es para ustedes?</summary>
              <p>
                Te lo decimos de frente y, si podemos, te orientamos hacia quien
                sí pueda ayudarte. Preferimos una recomendación honesta a un
                proyecto forzado.
              </p>
            </details>
          </div>
        </div>
      </section>
    </>
  );
}
