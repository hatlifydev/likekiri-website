import type { ReactElement } from 'react';

export function Terminos(): ReactElement {
  return (
    <section className="bloque">
      <div className="container prosa">
        <h1>Términos del servicio</h1>
        <p className="fecha">Última actualización: 1 de agosto de 2026</p>

        <h2>1. Quiénes somos</h2>
        <p>
          LikeKiri (en adelante, “LikeKiri” o “nosotros”) es una consultora de
          desarrollo de software especializada en automatización inteligente de
          procesos. Estos términos regulan tanto el uso de este sitio web como
          la contratación de nuestros servicios profesionales.
        </p>

        <h2>2. Servicios</h2>
        <p>
          Nuestros servicios incluyen, entre otros: diagnóstico y rediseño de
          procesos, desarrollo de automatizaciones batch y RPA, integración de
          sistemas, soluciones de inteligencia artificial aplicada, sistemas de
          recuperación aumentada (RAG) y entrenamiento y despliegue de modelos
          de lenguaje en infraestructura del cliente.
        </p>
        <p>
          El alcance, plazo y precio de cada proyecto se establecen en una
          propuesta escrita aceptada por ambas partes. Ningún contenido de este
          sitio constituye una oferta vinculante; las propuestas tienen la
          vigencia que en ellas se indique.
        </p>

        <h2>3. Obligaciones del cliente</h2>
        <ul>
          <li>
            Entregar información veraz y oportuna sobre los procesos y sistemas
            involucrados en el proyecto.
          </li>
          <li>
            Gestionar los accesos, licencias y autorizaciones internas
            necesarios para que el trabajo pueda ejecutarse.
          </li>
          <li>
            Designar una contraparte con capacidad de decisión durante el
            desarrollo del proyecto.
          </li>
        </ul>

        <h2>4. Propiedad intelectual</h2>
        <p>
          Salvo pacto en contrario, el código desarrollado a medida para un
          cliente le pertenece a ese cliente una vez pagado el proyecto.
          LikeKiri conserva la titularidad de sus herramientas, librerías,
          metodologías y modelos base preexistentes, sobre los cuales otorga al
          cliente una licencia de uso no exclusiva e intransferible en el marco
          del proyecto.
        </p>

        <h2>5. Confidencialidad</h2>
        <p>
          Toda información no pública a la que accedamos con ocasión de un
          proyecto se trata como confidencial, durante el proyecto y después de
          su término. Suscribimos acuerdos de confidencialidad específicos
          cuando el cliente lo requiere, y en proyectos con información regulada
          lo proponemos nosotros.
        </p>

        <h2>6. Protección de datos</h2>
        <p>
          Cuando el servicio implique tratamiento de datos personales, LikeKiri
          actúa como encargado de tratamiento conforme a las instrucciones
          documentadas del cliente y a la legislación aplicable. Los detalles se
          regulan en el acuerdo de tratamiento de datos que forma parte del
          contrato. Nuestra política de privacidad describe el tratamiento de
          datos de este sitio web.
        </p>

        <h2>7. Garantías y soporte</h2>
        <p>
          Los desarrollos entregados cuentan con un período de garantía de
          noventa días sobre defectos atribuibles a nuestra construcción, contado
          desde la aceptación. El soporte y la evolución posteriores se
          contratan mediante acuerdos de nivel de servicio separados.
        </p>

        <h2>8. Limitación de responsabilidad</h2>
        <p>
          La responsabilidad total de LikeKiri por daños derivados de un
          proyecto se limita al monto efectivamente pagado por el cliente en los
          doce meses anteriores al hecho que la origine. No respondemos por
          lucro cesante ni por daños indirectos, salvo dolo o culpa grave.
        </p>

        <h2>9. Uso del sitio</h2>
        <p>
          El contenido de este sitio es informativo y puede cambiar sin aviso.
          No está permitido usar el sitio para intentar acceder a sistemas o
          información de terceros, ni reproducir su contenido con fines
          comerciales sin autorización escrita.
        </p>

        <h2>10. Ley aplicable</h2>
        <p>
          Estos términos se rigen por la ley chilena. Cualquier controversia se
          someterá a los tribunales ordinarios de Santiago de Chile, sin
          perjuicio de los mecanismos de resolución alternativa que las partes
          acuerden en cada contrato.
        </p>

        <h2>Contacto</h2>
        <p>
          Para cualquier consulta sobre estos términos, escríbenos a{' '}
          <a href="mailto:contacto@likekiri.com">contacto@likekiri.com</a>.
        </p>
      </div>
    </section>
  );
}
