import { createElement, type ComponentType } from 'react';
import { renderToString } from 'react-dom/server';

import { RegistroIsland } from './RegistroIsland';
import { AccesoIsland } from './AccesoIsland';
import { PortalIsland } from './PortalIsland';

/**
 * Bundle SSR del módulo (ssr: 'server'): lo ejecuta EL SERVIDOR DEL MÓDULO
 * cuando el core le pide el HTML de una isla (POST /render), nunca el core.
 * El primer render debe ser determinista (mismo HTML en server y cliente) o
 * React reportará hydration mismatch.
 */
const COMPONENTS: Record<string, ComponentType<Record<string, unknown>>> = {
  './RegistroIsland': RegistroIsland as ComponentType<Record<string, unknown>>,
  './AccesoIsland': AccesoIsland as ComponentType<Record<string, unknown>>,
  './PortalIsland': PortalIsland as ComponentType<Record<string, unknown>>,
};

export function render(component: string, props: Record<string, unknown>): string | null {
  const Component = COMPONENTS[component];
  if (Component === undefined) return null;
  return renderToString(createElement(Component, props));
}
