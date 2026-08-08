import type { ReactElement } from 'react';

export function Privacidad(): ReactElement {
  return (
    <section className="bloque">
      <div className="container prosa">
        <h1>Política de privacidad</h1>
        <p className="fecha">Última actualización: 1 de agosto de 2026</p>

        <h2>Qué datos recogemos en este sitio</h2>
        <p>
          Este sitio no usa cookies de seguimiento ni herramientas de analítica
          de terceros. Los únicos datos personales que recibimos son los que tú
          nos envías voluntariamente al escribirnos por correo: tu nombre, tu
          dirección de correo y lo que decidas contarnos.
        </p>
        <p>
          Nuestros servidores registran, como cualquier servidor web, la
          dirección IP y la página solicitada en cada visita. Usamos esos
          registros solo para seguridad y diagnóstico técnico, y se eliminan de
          forma periódica.
        </p>

        <h2>Para qué usamos tus datos</h2>
        <ul>
          <li>Responder tus consultas y preparar propuestas que nos pidas.</li>
          <li>Gestionar la relación contractual si llegamos a trabajar juntos.</li>
          <li>Cumplir obligaciones legales cuando corresponda.</li>
        </ul>
        <p>
          No enviamos boletines ni comunicaciones comerciales no solicitadas, y
          no compartimos tus datos con terceros salvo obligación legal.
        </p>

        <h2>Datos de clientes en proyectos</h2>
        <p>
          La información a la que accedemos durante un proyecto —bases de datos,
          documentos, sistemas— pertenece al cliente y se trata conforme al
          contrato y al acuerdo de tratamiento de datos correspondiente. Como
          norma de diseño, los proyectos con información sensible se ejecutan en
          la infraestructura del cliente: esos datos no se copian a nuestros
          equipos ni se envían a servicios externos de inteligencia artificial.
        </p>

        <h2>Conservación</h2>
        <p>
          Conservamos la correspondencia comercial mientras exista una relación
          activa o una consulta en curso, y la documentación contractual durante
          los plazos que exige la ley.
        </p>

        <h2>Tus derechos</h2>
        <p>
          Puedes pedirnos en cualquier momento acceso, rectificación o
          eliminación de tus datos personales, escribiendo a{' '}
          <a href="mailto:contacto@likekiri.com">contacto@likekiri.com</a>.
          Respondemos dentro de los plazos legales y sin costo para ti.
        </p>

        <h2>Cambios a esta política</h2>
        <p>
          Si esta política cambia, publicaremos aquí la nueva versión con su
          fecha de actualización. Los cambios no se aplican retroactivamente a
          datos ya recogidos sin tu consentimiento.
        </p>
      </div>
    </section>
  );
}
