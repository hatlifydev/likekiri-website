import { createElement, useEffect, useState, type ComponentType, type ReactElement } from 'react';

import type { ShellRoute } from '../api';
import { loadRemoteComponent } from '../federation';

/**
 * Monta la página remota de un módulo (micro-frontend federado). Un módulo
 * caído degrada su página, nunca el panel completo.
 */
export function ModulePage({
  route,
  params,
}: {
  route: ShellRoute;
  params: Record<string, string>;
}): ReactElement {
  const [state, setState] = useState<{
    Component?: ComponentType<Record<string, unknown>>;
    error?: string;
  }>({});

  useEffect(() => {
    let cancelled = false;
    setState({});
    loadRemoteComponent(route)
      .then((Component) => {
        if (!cancelled) setState({ Component });
      })
      .catch((error: unknown) => {
        console.error(`[likekiri] módulo ${route.moduleId} falló:`, error);
        if (!cancelled) setState({ error: 'Este módulo no está disponible en este momento.' });
      });
    return () => {
      cancelled = true;
    };
  }, [route, route.moduleId, route.component]);

  if (state.error !== undefined) {
    return (
      <div className="panel">
        <p className="error">{state.error}</p>
      </div>
    );
  }
  if (state.Component === undefined) {
    return <p className="muted">Cargando módulo…</p>;
  }
  return createElement(state.Component, params);
}
