import {
  useCallback,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import { dict, resolveLocale, type Locale } from '@likekiri/i18n';

import { api, type Me, type ShellManifest, type ShellMenuEntry } from './api';
import { matchModuleRoute } from './federation';
import { Link, navigate, usePath } from './router';
import { adminCss } from './styles';
import { AcceptInvite } from './views/AcceptInvite';
import { Login } from './views/Login';
import { ModulePage } from './views/ModulePage';

function MenuItem({ to, label, active }: { to: string; label: string; active: boolean }): ReactElement {
  return (
    <Link to={to} className={active ? 'activo' : ''}>
      {label}
    </Link>
  );
}

/**
 * Grupo de menú registrado por un módulo. 'expanded' se muestra siempre
 * abierto; 'toggle' es plegable (arranca abierto si contiene la ruta activa).
 */
function MenuGroup({ entry, path }: { entry: ShellMenuEntry; path: string }): ReactElement {
  const containsActive = entry.children.some((child) => child.path === path);
  const isToggle = entry.mode === 'toggle';
  const [open, setOpen] = useState(!isToggle || containsActive);
  // Una entrada de menú con submenú: cabecera con aspecto de ítem e hijos
  // indentados colgando de ella. En 'toggle' la cabecera pliega/despliega.
  const hijos = (
    <div className="hijos">
      {entry.children.map((child) => (
        <MenuItem key={child.path} to={child.path} label={child.label} active={path === child.path} />
      ))}
    </div>
  );
  return (
    <div className="grupo">
      {isToggle ? (
        <button
          type="button"
          className="grupo-cabecera"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="caret">{open ? '▾' : '▸'}</span> {entry.label}
        </button>
      ) : (
        <div className="grupo-cabecera">
          <span className="caret">▾</span> {entry.label}
        </div>
      )}
      {open && hijos}
    </div>
  );
}

function Layout({
  me,
  manifest,
  onLogout,
  locale,
  children,
}: {
  me: Me;
  manifest: ShellManifest | null;
  onLogout: () => void;
  locale: Locale;
  children: ReactNode;
}): ReactElement {
  const path = usePath();
  const t = dict(locale);
  // El sitio público: mismo host sin el prefijo "admin.".
  const sitioUrl = `https://${window.location.host.replace(/^admin\./, '')}`;
  // El sidebar se construye COMPLETO desde el manifest: el shell no tiene
  // pantallas de negocio propias; cada parte del admin es un módulo.
  const entradas = (manifest?.menu ?? []).filter((entry) => entry.slot === 'sidebar');
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="marca">
          <img src="/admin-assets/logo.webp" alt="LikeKiri" className="logo" />
          <span className="etiqueta-admin">admin</span>
        </div>
        <nav>
          {entradas.map((entry) =>
            entry.children.length > 0 ? (
              <MenuGroup key={`${entry.moduleId}:${entry.label}`} entry={entry} path={path} />
            ) : entry.path !== null ? (
              <MenuItem key={entry.path} to={entry.path} label={entry.label} active={path === entry.path} />
            ) : null,
          )}
        </nav>
        <div className="abajo">
          {me.email}
          <a className="ver-sitio" href={sitioUrl} target="_blank" rel="noopener noreferrer">
            Ver sitio ↗
          </a>
          <button onClick={onLogout}>{t.admin.cerrarSesion}</button>
        </div>
      </aside>
      <main className="contenido">{children}</main>
    </div>
  );
}

function NotFound(): ReactElement {
  return (
    <>
      <h1>404</h1>
      <p className="muted">Esta página no existe en el panel.</p>
    </>
  );
}

/** Primer destino navegable del menú, para la ruta raíz. */
function firstMenuPath(manifest: ShellManifest | null): string | null {
  for (const entry of manifest?.menu ?? []) {
    if (entry.path !== null) return entry.path;
    const child = entry.children[0];
    if (child !== undefined) return child.path;
  }
  return null;
}

export function App(): ReactElement {
  const path = usePath();
  const [me, setMe] = useState<Me | null>(null);
  const [manifest, setManifest] = useState<ShellManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [locale, setLocale] = useState<Locale>('es');
  const t = dict(locale);

  const cargarSesion = useCallback((): void => {
    setLoading(true);
    api
      .me()
      .then((session) => {
        setMe(session);
        setLocale(resolveLocale(session.lang));
        return api.manifest().then(setManifest);
      })
      .catch(() => {
        setMe(null);
        setManifest(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(cargarSesion, [cargarSesion]);

  // Raíz (o /login con sesión): ir al primer destino visible del menú.
  useEffect(() => {
    if (me !== null && manifest !== null && (path === '/' || path === '/login')) {
      const destino = firstMenuPath(manifest);
      if (destino !== null) navigate(destino);
    }
  }, [me, manifest, path]);

  const logout = (): void => {
    void api
      .logout()
      .catch(() => undefined)
      .then(() => {
        setMe(null);
        setManifest(null);
        navigate('/login');
      });
  };

  // Página pública: aceptar invitación (no exige sesión).
  if (path === '/accept-invite') {
    return (
      <>
        <style>{adminCss}</style>
        <AcceptInvite />
      </>
    );
  }

  if (loading) {
    return (
      <>
        <style>{adminCss}</style>
        <div className="centrado">
          <p className="muted">{t.admin.cargando}</p>
        </div>
      </>
    );
  }

  // Sin sesión → login, venga de donde venga.
  if (me === null) {
    return (
      <>
        <style>{adminCss}</style>
        <Login
          onLogin={() => {
            cargarSesion();
            navigate('/');
          }}
        />
      </>
    );
  }

  const moduleMatch = manifest === null ? null : matchModuleRoute(manifest.routes, path);
  const contenido: ReactElement =
    path === '/' || path === '/login' ? (
      firstMenuPath(manifest) === null ? (
        <>
          <h1>{t.admin.bienvenido}</h1>
          <p className="muted">{t.admin.sinAcceso}</p>
        </>
      ) : (
        <p className="muted">{t.admin.cargando}</p>
      )
    ) : moduleMatch !== null ? (
      <ModulePage route={moduleMatch.route} params={moduleMatch.params} />
    ) : (
      <NotFound />
    );

  return (
    <>
      <style>{adminCss}</style>
      <Layout me={me} manifest={manifest} onLogout={logout} locale={locale}>
        {contenido}
      </Layout>
    </>
  );
}
