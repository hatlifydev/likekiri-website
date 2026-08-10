/**
 * Cadenas en español (idioma base). La forma de este objeto define el tipo
 * Dictionary; en.ts debe coincidir en claves. Para traducir una parte nueva
 * del sitio, agrega la clave aquí y su equivalente en en.ts.
 */
export const es = {
  localeName: 'Español',
  nav: {
    personas: 'Personas',
    empresas: 'Empresas',
    equipo: 'Equipo',
    contacto: 'Contacto',
    iniciarSesion: 'Iniciar sesión',
  },
  footer: {
    derechos: 'Desarrollo y consultoría de software',
    portalClientes: 'Portal de clientes',
    terminos: 'Términos del servicio',
    privacidad: 'Privacidad',
  },
  home: {
    metaTitle: 'LikeKiri — Automatización inteligente de procesos',
    heroTitulo: 'Automatizamos los procesos que le quitan tiempo a tu equipo',
    heroLead:
      'Somos una consultora de desarrollo de software especializada en automatización inteligente de procesos (IPA). Tomamos ese trabajo repetitivo que hoy se hace a mano —copiar datos, cruzar planillas, revisar documentos, responder lo mismo una y otra vez— y lo convertimos en procesos que corren solos, con supervisión humana donde importa.',
    ctaConversemos: 'Conversemos',
    ctaEmpresas: 'Soluciones para empresas',
    s1Titulo: 'Qué hacemos, en simple',
    s1Intro: 'No vendemos magia: combinamos cuatro herramientas bien entendidas y elegimos la más barata y confiable que resuelva tu problema.',
    s1BatchT: 'Procesos batch',
    s1BatchD: 'Tareas masivas que corren de noche o cada hora: conciliaciones, cargas de datos, generación de reportes. Lo clásico, bien hecho y monitoreado.',
    s1RpaT: 'RPA',
    s1RpaD: 'Robots de software que operan los mismos sistemas que usa tu equipo: ingresan datos, descargan archivos, mueven información entre aplicaciones que no se hablan entre sí.',
    s1IaT: 'IA aplicada',
    s1IaD: 'Clasificación de documentos, extracción de datos de PDFs y correos, detección de anomalías. IA puesta a trabajar en pasos concretos de un proceso, no como fin en sí misma.',
    s1RagT: 'RAG con grandes modelos',
    s1RagD: 'Asistentes que responden con la información de tu organización —contratos, manuales, historiales— citando la fuente, en lugar de inventar.',
    s2Titulo: 'Modelos propios, datos en casa',
    s2Intro: 'Cuando la información no puede salir de tu infraestructura, entrenamos y desplegamos modelos de lenguaje propios que corren on-premise o en tu nube privada.',
    s2PrecisosT: 'Más precisos en su dominio',
    s2PrecisosD: 'Nuestros modelos no buscan competir con los grandes proveedores en tareas generales. Están entrenados para un dominio acotado, y en ese dominio responden con más precisión y menos alucinaciones.',
    s2DatosT: 'Tus datos no viajan',
    s2DatosD: 'Todo el ciclo —consulta, procesamiento y respuesta— ocurre en tus servidores. Nada se envía a APIs de terceros, nada queda en logs ajenos.',
    s2ConsumoT: 'Bajo consumo',
    s2ConsumoD: 'Modelos pequeños y especializados que funcionan en hardware modesto, sin GPUs de última generación ni facturas de nube que crecen sin control.',
    s3Titulo: 'Donde la privacidad no es negociable',
    s3Intro: 'Trabajamos con especial foco en sectores donde un dato filtrado es un problema legal, no solo reputacional.',
    s3JuridicoT: 'Jurídico',
    s3JuridicoD: 'Estudios y fiscalías internas: búsqueda en jurisprudencia y contratos, redacción asistida de escritos, revisión de cláusulas. El expediente nunca sale del estudio.',
    s3SaludT: 'Salud',
    s3SaludD: 'Clínicas y laboratorios: resúmenes de fichas, codificación de diagnósticos, apoyo a informes. La historia clínica se queda donde la ley exige que esté.',
    s4Titulo: 'Cómo trabajamos',
    s4DiagT: '1 · Diagnóstico',
    s4DiagD: 'Dos semanas mirando tus procesos reales. Salimos con un mapa de qué automatizar, qué no, y cuánto cuesta cada cosa.',
    s4PilotoT: '2 · Piloto',
    s4PilotoD: 'Un proceso, de punta a punta, en producción controlada. Con métricas antes y después para que la decisión sea con números.',
    s4DespliegueT: '3 · Despliegue',
    s4DespliegueD: 'Extendemos lo que funcionó, integramos con tus sistemas y dejamos monitoreo y alertas operando.',
    s4AcompT: '4 · Acompañamiento',
    s4AcompD: 'Tu equipo queda capacitado para operar y ajustar. Nosotros quedamos disponibles para lo que crezca después.',
    ctaAgenda: 'Agenda una conversación',
  },
  admin: {
    cerrarSesion: 'Cerrar sesión',
    idioma: 'Idioma',
    bienvenido: 'Bienvenido',
    sinAcceso: 'Tu cuenta no tiene acceso a ningún módulo todavía. Pide a un administrador que te asigne permisos.',
    cargando: 'Cargando…',
  },
};

export type Dictionary = typeof es;
