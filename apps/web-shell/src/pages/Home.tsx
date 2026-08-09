import type { ReactElement } from 'react';

import { FigurasHero } from '../decor';

export function Home(): ReactElement {
  return (
    <>
      <section className="hero franja-oscura">
        <FigurasHero />
        <div className="container">
          <h1>Automatizamos los procesos que le quitan tiempo a tu equipo</h1>
          <p className="lead">
            Somos una consultora de desarrollo de software especializada en
            automatización inteligente de procesos (IPA). Tomamos ese trabajo
            repetitivo que hoy se hace a mano —copiar datos, cruzar planillas,
            revisar documentos, responder lo mismo una y otra vez— y lo
            convertimos en procesos que corren solos, con supervisión humana
            donde importa.
          </p>
          <div className="acciones">
            <a className="boton" href="/contacto">
              Conversemos
            </a>
            <a className="boton secundario" href="/empresas">
              Soluciones para empresas
            </a>
          </div>
        </div>
      </section>

      <section className="bloque alterno">
        <div className="container">
          <h2>Qué hacemos, en simple</h2>
          <p className="intro">
            No vendemos magia: combinamos cuatro herramientas bien entendidas y
            elegimos la más barata y confiable que resuelva tu problema.
          </p>
          <div className="tarjetas">
            <div className="tarjeta reveal">
              <h3>Procesos batch</h3>
              <p>
                Tareas masivas que corren de noche o cada hora: conciliaciones,
                cargas de datos, generación de reportes. Lo clásico, bien hecho
                y monitoreado.
              </p>
            </div>
            <div className="tarjeta reveal">
              <h3>RPA</h3>
              <p>
                Robots de software que operan los mismos sistemas que usa tu
                equipo: ingresan datos, descargan archivos, mueven información
                entre aplicaciones que no se hablan entre sí.
              </p>
            </div>
            <div className="tarjeta reveal">
              <h3>IA aplicada</h3>
              <p>
                Clasificación de documentos, extracción de datos de PDFs y
                correos, detección de anomalías. IA puesta a trabajar en pasos
                concretos de un proceso, no como fin en sí misma.
              </p>
            </div>
            <div className="tarjeta reveal">
              <h3>RAG con grandes modelos</h3>
              <p>
                Asistentes que responden con la información de tu organización
                —contratos, manuales, historiales— citando la fuente, en lugar
                de inventar.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bloque">
        <div className="container">
          <h2>Modelos propios, datos en casa</h2>
          <p className="intro">
            Cuando la información no puede salir de tu infraestructura,
            entrenamos y desplegamos modelos de lenguaje propios que corren
            on-premise o en tu nube privada.
          </p>
          <div className="tarjetas">
            <div className="tarjeta reveal">
              <h3>Más precisos en su dominio</h3>
              <p>
                Nuestros modelos no buscan competir con los grandes proveedores
                en tareas generales. Están entrenados para un dominio acotado, y
                en ese dominio responden con más precisión y menos alucinaciones.
              </p>
            </div>
            <div className="tarjeta reveal">
              <h3>Tus datos no viajan</h3>
              <p>
                Todo el ciclo —consulta, procesamiento y respuesta— ocurre en tus
                servidores. Nada se envía a APIs de terceros, nada queda en logs
                ajenos.
              </p>
            </div>
            <div className="tarjeta reveal">
              <h3>Bajo consumo</h3>
              <p>
                Modelos pequeños y especializados que funcionan en hardware
                modesto, sin GPUs de última generación ni facturas de nube que
                crecen sin control.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bloque alterno">
        <div className="container">
          <h2>Donde la privacidad no es negociable</h2>
          <p className="intro">
            Trabajamos con especial foco en sectores donde un dato filtrado es
            un problema legal, no solo reputacional.
          </p>
          <div className="tarjetas">
            <div className="tarjeta reveal">
              <h3>Jurídico</h3>
              <p>
                Estudios y fiscalías internas: búsqueda en jurisprudencia y
                contratos, redacción asistida de escritos, revisión de cláusulas.
                El expediente nunca sale del estudio.
              </p>
            </div>
            <div className="tarjeta reveal">
              <h3>Salud</h3>
              <p>
                Clínicas y laboratorios: resúmenes de fichas, codificación de
                diagnósticos, apoyo a informes. La historia clínica se queda
                donde la ley exige que esté.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bloque">
        <div className="container">
          <h2>Cómo trabajamos</h2>
          <div className="tarjetas">
            <div className="tarjeta reveal">
              <h3>1 · Diagnóstico</h3>
              <p>
                Dos semanas mirando tus procesos reales. Salimos con un mapa de
                qué automatizar, qué no, y cuánto cuesta cada cosa.
              </p>
            </div>
            <div className="tarjeta reveal">
              <h3>2 · Piloto</h3>
              <p>
                Un proceso, de punta a punta, en producción controlada. Con
                métricas antes y después para que la decisión sea con números.
              </p>
            </div>
            <div className="tarjeta reveal">
              <h3>3 · Despliegue</h3>
              <p>
                Extendemos lo que funcionó, integramos con tus sistemas y
                dejamos monitoreo y alertas operando.
              </p>
            </div>
            <div className="tarjeta reveal">
              <h3>4 · Acompañamiento</h3>
              <p>
                Tu equipo queda capacitado para operar y ajustar. Nosotros
                quedamos disponibles para lo que crezca después.
              </p>
            </div>
          </div>
          <div className="acciones" style={{ marginTop: '2.5rem' }}>
            <a className="boton" href="/contacto">
              Agenda una conversación
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
