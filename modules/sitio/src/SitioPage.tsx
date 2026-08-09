import { useEffect, useState, type ReactElement } from 'react';

/**
 * Editor de la estructura del sitio público (server-driven UI).
 *
 * El patrón completo: este módulo edita la config vía la API del core
 * (/api/admin/shell-config, permiso shell.manage); el core la persiste y la
 * inyecta en cada render del SSR; el shell web la pinta. El front queda
 * gestionado desde el admin sin desplegar nada.
 */

interface SiteLink {
  label: string;
  path: string;
}

interface SiteConfig {
  anuncio: string | null;
  header: { links: SiteLink[] };
  footer: { links: SiteLink[] };
}

async function fetchConfig(): Promise<{ config: SiteConfig; defaults: SiteConfig }> {
  const response = await fetch('/api/admin/shell-config', { credentials: 'same-origin' });
  if (!response.ok) throw new Error(`error ${response.status}`);
  return (await response.json()) as { config: SiteConfig; defaults: SiteConfig };
}

async function saveConfig(config: SiteConfig): Promise<void> {
  const response = await fetch('/api/admin/shell-config', {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!response.ok) {
    let message = `error ${response.status}`;
    try {
      const data = (await response.json()) as { message?: string };
      if (typeof data.message === 'string') message = data.message;
    } catch {
      // mensaje genérico
    }
    throw new Error(message);
  }
}

function EditorLinks({
  titulo,
  links,
  onChange,
}: {
  titulo: string;
  links: SiteLink[];
  onChange: (links: SiteLink[]) => void;
}): ReactElement {
  const set = (index: number, campo: keyof SiteLink, valor: string): void => {
    onChange(links.map((link, i) => (i === index ? { ...link, [campo]: valor } : link)));
  };
  const mover = (index: number, delta: number): void => {
    const destino = index + delta;
    if (destino < 0 || destino >= links.length) return;
    const copia = [...links];
    const [item] = copia.splice(index, 1);
    copia.splice(destino, 0, item as SiteLink);
    onChange(copia);
  };
  return (
    <div className="panel">
      <h2>{titulo}</h2>
      {links.map((link, index) => (
        <div
          key={index}
          style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}
        >
          <input
            value={link.label}
            placeholder="Etiqueta"
            onChange={(e) => set(index, 'label', e.target.value)}
            style={{ flex: 1 }}
          />
          <input
            value={link.path}
            placeholder="/ruta"
            onChange={(e) => set(index, 'path', e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="boton mini suave" onClick={() => mover(index, -1)} title="Subir">
            ↑
          </button>
          <button className="boton mini suave" onClick={() => mover(index, 1)} title="Bajar">
            ↓
          </button>
          <button
            className="boton mini peligro"
            onClick={() => onChange(links.filter((_, i) => i !== index))}
          >
            Quitar
          </button>
        </div>
      ))}
      <button
        className="boton mini suave"
        onClick={() => onChange([...links, { label: '', path: '/' }])}
        disabled={links.length >= 8}
      >
        + Añadir enlace
      </button>
    </div>
  );
}

export function SitioPage(): ReactElement {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchConfig()
      .then(({ config: actual }) => setConfig(actual))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'no se pudo cargar'),
      );
  }, []);

  const guardar = async (): Promise<void> => {
    if (config === null) return;
    setBusy(true);
    setError(null);
    setGuardado(false);
    try {
      const limpio: SiteConfig = {
        anuncio: config.anuncio !== null && config.anuncio.trim() !== '' ? config.anuncio.trim() : null,
        header: { links: config.header.links.filter((l) => l.label.trim() !== '' && l.path.trim() !== '') },
        footer: { links: config.footer.links.filter((l) => l.label.trim() !== '' && l.path.trim() !== '') },
      };
      await saveConfig(limpio);
      setConfig(limpio);
      setGuardado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'no se pudo guardar');
    } finally {
      setBusy(false);
    }
  };

  if (config === null) {
    return (
      <>
        <h1>Sitio web</h1>
        {error !== null ? <p className="error">{error}</p> : <p className="muted">Cargando…</p>}
      </>
    );
  }

  return (
    <>
      <h1>Sitio web</h1>
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        Lo que guardes aquí lo aplica el servidor en el próximo render de
        likekiri.com (sin desplegar nada). Tarda hasta 30 segundos en verse.
      </p>

      <div className="panel">
        <h2>Anuncio</h2>
        <p className="muted" style={{ marginBottom: '0.75rem' }}>
          Franja destacada sobre el encabezado del sitio. Déjalo vacío para ocultarla.
        </p>
        <input
          value={config.anuncio ?? ''}
          placeholder="p. ej. Agenda tu diagnóstico gratuito de procesos este mes"
          onChange={(e) => setConfig({ ...config, anuncio: e.target.value })}
        />
      </div>

      <EditorLinks
        titulo="Menú del encabezado"
        links={config.header.links}
        onChange={(links) => setConfig({ ...config, header: { links } })}
      />
      <EditorLinks
        titulo="Enlaces del pie"
        links={config.footer.links}
        onChange={(links) => setConfig({ ...config, footer: { links } })}
      />

      {error !== null && <p className="error">{error}</p>}
      {guardado && <div className="aviso" style={{ marginBottom: '1rem' }}>Guardado. El sitio lo aplicará en el próximo render.</div>}
      <button className="boton" onClick={() => void guardar()} disabled={busy}>
        {busy ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </>
  );
}
