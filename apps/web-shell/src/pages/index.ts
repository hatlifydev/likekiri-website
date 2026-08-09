import type { ReactElement } from 'react';

import { Home } from './Home';
import { Personas } from './Personas';
import { Empresas } from './Empresas';
import { Equipo } from './Equipo';
import { Contacto } from './Contacto';
import { Terminos } from './Terminos';
import { Privacidad } from './Privacidad';

export interface TeamMember {
  displayName: string;
  title: string;
  bio: string;
  initials: string;
}

/** Contexto que el core inyecta en el render y las páginas pueden consumir. */
export interface PageContext {
  team: TeamMember[];
}

export interface StaticPage {
  path: string;
  title: string;
  description: string;
  Component: (ctx: PageContext) => ReactElement;
}

export const staticPages: StaticPage[] = [
  {
    path: '/',
    title: 'LikeKiri — Automatización inteligente de procesos',
    description:
      'Consultora de desarrollo de software especializada en IPA: procesos batch, RPA, IA aplicada, RAG y modelos de lenguaje propios que corren on-premise.',
    Component: Home,
  },
  {
    path: '/personas',
    title: 'LikeKiri para personas y equipos pequeños',
    description:
      'Automatización de tareas repetitivas, asistentes con tus propios documentos y capacitación en IA segura para profesionales independientes.',
    Component: Personas,
  },
  {
    path: '/empresas',
    title: 'LikeKiri para empresas',
    description:
      'RPA a escala, integraciones batch, RAG corporativo y modelos LLM on-premise para organizaciones que manejan datos sensibles.',
    Component: Empresas,
  },
  {
    path: '/equipo',
    title: 'Equipo — LikeKiri',
    description:
      'Las personas detrás de LikeKiri: tecnología, consultoría de procesos, ingeniería de datos, RPA y cumplimiento.',
    Component: Equipo,
  },
  {
    path: '/contacto',
    title: 'Contacto — LikeKiri',
    description:
      'Cuéntanos qué proceso quieres automatizar. Respondemos dentro de un día hábil.',
    Component: Contacto,
  },
  {
    path: '/terminos',
    title: 'Términos del servicio — LikeKiri',
    description: 'Condiciones que regulan el uso de este sitio y la contratación de los servicios de LikeKiri.',
    Component: Terminos,
  },
  {
    path: '/privacidad',
    title: 'Política de privacidad — LikeKiri',
    description: 'Qué datos personales tratamos, para qué y cuáles son tus derechos.',
    Component: Privacidad,
  },
];

export function findPage(path: string): StaticPage | null {
  const clean = path.replace(/\/+$/, '') || '/';
  return staticPages.find((page) => page.path === clean) ?? null;
}
