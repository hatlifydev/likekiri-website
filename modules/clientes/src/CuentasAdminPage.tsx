import { useCallback, useEffect, useState, type FormEvent, type ReactElement, type ReactNode } from 'react';

import {
  api,
  ApiError,
  CICLOS,
  type Ciclo,
  type ClienteProducto,
  type PlanCatalogo,
  type ProductoAdmin,
} from './api';

/** Ciclos que un plan permite (vacío = todos). */
function ciclosDe(plan: PlanCatalogo | undefined): Ciclo[] {
  const ids = CICLOS.map((c) => c.id);
  if (!plan || plan.ciclosPermitidos.length === 0) return ids;
  return ids.filter((c) => plan.ciclosPermitidos.includes(c));
}
const nombreCiclo = (id: Ciclo): string => CICLOS.find((c) => c.id === id)?.nombre ?? id;

/** Ítem de un menú vertical (estilo submenú del admin). */
function MenuBtn({
  activo,
  sub = false,
  onClick,
  children,
}: {
  activo: boolean;
  sub?: boolean;
  onClick: () => void;
  children: ReactNode;
}): ReactElement {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: sub ? '0.5rem 0.85rem 0.5rem 1.4rem' : '0.55rem 0.85rem',
        border: 'none',
        borderLeft: `3px solid ${activo ? 'var(--lk-color-brand)' : 'transparent'}`,
        borderRadius: '8px',
        background: activo ? 'rgba(46,139,87,0.14)' : 'transparent',
        color: activo ? 'var(--lk-color-brand)' : 'var(--lk-color-text)',
        fontWeight: activo ? 600 : 400,
        fontSize: sub ? '0.92rem' : '0.95rem',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

/**
 * Admin del módulo clientes: dos vistas — CLIENTES (por producto/subcategoría,
 * con su clave de integración y sus clientes) y CATÁLOGO DE PLANES (generador
 * de planes reutilizables, asociables a productos).
 */
export function CuentasAdminPage(): ReactElement {
  const [vista, setVista] = useState<'clientes' | 'catalogo'>('clientes');
  const [subtab, setSubtab] = useState<'clientes' | 'ajustes'>('clientes');
  const [productos, setProductos] = useState<ProductoAdmin[] | null>(null);
  const [catalogo, setCatalogo] = useState<PlanCatalogo[] | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [clientes, setClientes] = useState<ClienteProducto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fallo = (err: unknown, alt: string): void => setError(err instanceof ApiError ? err.message : alt);

  const cargarProductos = useCallback((): void => {
    api
      .adminProductos()
      .then((ps) => {
        setProductos(ps);
        setSlug((actual) => actual ?? (ps[0]?.slug ?? null));
      })
      .catch((err) => fallo(err, 'no se pudo cargar productos'));
  }, []);
  const cargarCatalogo = useCallback((): void => {
    api.adminPlanes().then(setCatalogo).catch((err) => fallo(err, 'no se pudo cargar el catálogo'));
  }, []);
  const cargarClientes = useCallback((s: string): void => {
    api.adminClientesDeProducto(s).then(setClientes).catch((err) => fallo(err, 'no se pudo cargar clientes'));
  }, []);

  useEffect(cargarProductos, [cargarProductos]);
  useEffect(cargarCatalogo, [cargarCatalogo]);
  useEffect(() => {
    if (slug === null) return;
    setClientes(null);
    cargarClientes(slug);
  }, [slug, cargarClientes]);

  const producto = productos?.find((p) => p.slug === slug) ?? null;

  return (
    <>
      <h1>Clientes</h1>
      {error !== null && <p className="error">{error}</p>}

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <nav style={{ width: '210px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div
            className="muted"
            style={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em', padding: '0.25rem 0.85rem', marginTop: '0.25rem' }}
          >
            Productos
          </div>
          {(productos ?? []).map((p) => (
            <MenuBtn
              key={p.slug}
              sub
              activo={vista === 'clientes' && p.slug === slug}
              onClick={() => {
                setVista('clientes');
                setSlug(p.slug);
              }}
            >
              {p.nombre} <span className="muted">({p.clientes})</span>
            </MenuBtn>
          ))}
          <div style={{ height: '0.75rem' }} />
          <MenuBtn activo={vista === 'catalogo'} onClick={() => setVista('catalogo')}>
            Catálogo de planes
          </MenuBtn>
        </nav>

        <div style={{ flex: 1, minWidth: '320px' }}>
          {vista === 'catalogo' ? (
            <PlanesCatalogo
              catalogo={catalogo}
              onCambio={() => {
                cargarCatalogo();
                cargarProductos();
              }}
              onError={setError}
            />
          ) : productos === null ? (
            <p className="muted">Cargando…</p>
          ) : producto !== null ? (
            <>
              <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--lk-color-border)', marginBottom: '1.25rem' }}>
                {([['clientes', 'Clientes'], ['ajustes', 'Ajustes']] as const).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setSubtab(id)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      padding: '0.6rem 1rem',
                      fontSize: '0.95rem',
                      fontWeight: subtab === id ? 600 : 400,
                      color: subtab === id ? 'var(--lk-color-brand)' : 'var(--lk-color-textMuted)',
                      borderBottom: `2px solid ${subtab === id ? 'var(--lk-color-brand)' : 'transparent'}`,
                      marginBottom: '-1px',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {subtab === 'ajustes' ? (
                <>
                  <Integracion producto={producto} onCambio={cargarProductos} onError={setError} />
                  <AsociarPlanes
                    producto={producto}
                    catalogo={catalogo}
                    onCambio={() => {
                      cargarProductos();
                      if (slug) cargarClientes(slug);
                    }}
                    onError={setError}
                  />
                </>
              ) : (
                <>
                  <AltaCliente producto={producto} onCreado={() => cargarClientes(producto.slug)} onError={setError} />
                  <TablaClientes
                    producto={producto}
                    clientes={clientes}
                    onCambio={() => {
                      cargarClientes(producto.slug);
                      cargarProductos();
                    }}
                    onError={setError}
                  />
                </>
              )}
            </>
          ) : (
            <p className="muted">Seleccioná un producto.</p>
          )}
        </div>
      </div>
    </>
  );
}

// ——— generador: catálogo global de planes ———
function PlanesCatalogo({
  catalogo,
  onCambio,
  onError,
}: {
  catalogo: PlanCatalogo[] | null;
  onCambio: () => void;
  onError: (m: string) => void;
}): ReactElement {
  const [clave, setClave] = useState('');
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState(0);
  const [features, setFeatures] = useState('');
  const [ciclos, setCiclos] = useState<Ciclo[]>(CICLOS.map((c) => c.id));

  const crear = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    try {
      await api.adminCrearPlan({
        clave,
        nombre,
        precio,
        features: features.split('\n').map((f) => f.trim()).filter(Boolean),
        ciclosPermitidos: ciclos,
        activo: true,
      });
      setClave('');
      setNombre('');
      setPrecio(0);
      setFeatures('');
      onCambio();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'no se pudo crear el plan');
    }
  };

  const toggleCiclo = (c: Ciclo): void => setCiclos((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  return (
    <>
      <div className="panel">
        <h2>Nuevo plan</h2>
        <p className="muted">Los planes son reutilizables: se crean una vez y se asocian a los productos que quieras.</p>
        <form onSubmit={(e) => void crear(e)} style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            <div>
              <label>Clave (única)</label>
              <input value={clave} onChange={(e) => setClave(e.target.value)} placeholder="premium" required />
            </div>
            <div>
              <label>Nombre</label>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Premium" required />
            </div>
            <div>
              <label>Precio (CLP)</label>
              <input type="number" min="0" value={precio} onChange={(e) => setPrecio(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <label>Ciclos permitidos</label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {CICLOS.map((c) => (
                <label key={c.id} style={{ display: 'inline-flex', gap: '0.3rem', alignItems: 'center', fontWeight: 400 }}>
                  <input type="checkbox" checked={ciclos.includes(c.id)} onChange={() => toggleCiclo(c.id)} /> {c.nombre}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label>Características (una por línea)</label>
            <textarea rows={3} value={features} onChange={(e) => setFeatures(e.target.value)} placeholder={'Exportar PDF\nHasta 10 usuarios'} />
          </div>
          <div>
            <button className="boton">Crear plan</button>
          </div>
        </form>
      </div>

      <div className="panel">
        <h2>Catálogo</h2>
        {catalogo === null ? (
          <p className="muted">Cargando…</p>
        ) : catalogo.length === 0 ? (
          <p className="muted">Todavía no hay planes.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Plan</th>
                <th>Precio</th>
                <th>Ciclos</th>
                <th>Características</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {catalogo.map((p) => (
                <FilaPlan key={p.id} plan={p} onCambio={onCambio} onError={onError} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function FilaPlan({ plan, onCambio, onError }: { plan: PlanCatalogo; onCambio: () => void; onError: (m: string) => void }): ReactElement {
  const [precio, setPrecio] = useState(plan.precio);
  const [ciclos, setCiclos] = useState<Ciclo[]>(plan.ciclosPermitidos);
  const [features, setFeatures] = useState(plan.features.join('\n'));
  const [edit, setEdit] = useState(false);

  const guardar = async (): Promise<void> => {
    try {
      await api.adminEditarPlan(plan.id, {
        precio,
        ciclosPermitidos: ciclos,
        features: features.split('\n').map((f) => f.trim()).filter(Boolean),
      });
      setEdit(false);
      onCambio();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'no se pudo guardar');
    }
  };
  const alternarActivo = async (): Promise<void> => {
    try {
      await api.adminEditarPlan(plan.id, { activo: !plan.activo });
      onCambio();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'no se pudo cambiar el estado');
    }
  };
  const eliminar = async (): Promise<void> => {
    if (!window.confirm(`¿Eliminar el plan "${plan.nombre}"? Se quita de todos los productos.`)) return;
    try {
      await api.adminEliminarPlan(plan.id);
      onCambio();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'no se pudo eliminar');
    }
  };
  const toggleCiclo = (c: Ciclo): void => setCiclos((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  return (
    <tr>
      <td>
        <strong>{plan.nombre}</strong>
        <div className="muted" style={{ fontFamily: 'var(--lk-font-mono)' }}>{plan.clave}</div>
      </td>
      <td>
        {edit ? (
          <input type="number" min="0" value={precio} onChange={(e) => setPrecio(Number(e.target.value))} style={{ width: '7rem' }} />
        ) : plan.precio === 0 ? (
          'Gratis'
        ) : (
          `$${plan.precio.toLocaleString('es-CL')}`
        )}
      </td>
      <td>
        {edit ? (
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {CICLOS.map((c) => (
              <label key={c.id} style={{ display: 'inline-flex', gap: '0.2rem', alignItems: 'center', fontWeight: 400, fontSize: '0.8rem' }}>
                <input type="checkbox" checked={ciclos.includes(c.id)} onChange={() => toggleCiclo(c.id)} /> {c.nombre}
              </label>
            ))}
          </div>
        ) : (
          <span className="muted">{plan.ciclosPermitidos.map(nombreCiclo).join(', ') || 'todos'}</span>
        )}
      </td>
      <td>
        {edit ? (
          <textarea rows={2} value={features} onChange={(e) => setFeatures(e.target.value)} style={{ minWidth: '12rem' }} />
        ) : (
          <span className="muted">{plan.features.join(', ') || '—'}</span>
        )}
      </td>
      <td>
        <span className={`chip ${plan.activo ? 'ok' : 'neutro'}`}>{plan.activo ? 'activo' : 'oculto'}</span>
      </td>
      <td>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {edit ? (
            <button className="boton mini" onClick={() => void guardar()}>
              Guardar
            </button>
          ) : (
            <button className="boton mini suave" onClick={() => setEdit(true)}>
              Editar
            </button>
          )}
          <button className="boton mini suave" onClick={() => void alternarActivo()}>
            {plan.activo ? 'Ocultar' : 'Activar'}
          </button>
          <button className="boton mini peligro" onClick={() => void eliminar()}>
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  );
}

// ——— asociar planes del catálogo a un producto ———
function AsociarPlanes({
  producto,
  catalogo,
  onCambio,
  onError,
}: {
  producto: ProductoAdmin;
  catalogo: PlanCatalogo[] | null;
  onCambio: () => void;
  onError: (m: string) => void;
}): ReactElement {
  const [sel, setSel] = useState<string[]>(producto.planIdsAsociados);
  useEffect(() => setSel(producto.planIdsAsociados), [producto.slug, producto.planIdsAsociados]);

  const toggle = (id: string): void => setSel((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const guardar = async (): Promise<void> => {
    try {
      await api.adminAsociarPlanes(producto.slug, sel);
      onCambio();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'no se pudieron asociar los planes');
    }
  };

  return (
    <div className="panel">
      <h2>Planes de {producto.nombre}</h2>
      <p className="muted">Elegí del catálogo qué planes se ofrecen en este producto.</p>
      {catalogo === null ? (
        <p className="muted">Cargando…</p>
      ) : (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {catalogo.map((p) => (
            <label key={p.id} style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center', fontWeight: 400, opacity: p.activo ? 1 : 0.5 }}>
              <input type="checkbox" checked={sel.includes(p.id)} onChange={() => toggle(p.id)} /> {p.nombre}
              {!p.activo && <span className="muted"> (oculto)</span>}
            </label>
          ))}
        </div>
      )}
      <button className="boton mini" onClick={() => void guardar()}>
        Guardar planes del producto
      </button>
    </div>
  );
}

// ——— panel de integración (API key + orígenes) ———
function Integracion({
  producto,
  onCambio,
  onError,
}: {
  producto: ProductoAdmin;
  onCambio: () => void;
  onError: (m: string) => void;
}): ReactElement {
  const [ver, setVer] = useState(false);
  const [origenes, setOrigenes] = useState(producto.origenesPermitidos.join('\n'));
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => setOrigenes(producto.origenesPermitidos.join('\n')), [producto.slug, producto.origenesPermitidos]);

  const rotar = async (): Promise<void> => {
    if (!window.confirm(`¿Rotar la API key de ${producto.nombre}? La clave anterior dejará de funcionar.`)) return;
    try {
      await api.adminRotarApiKey(producto.slug);
      setAviso('Clave rotada. Actualizala en la app.');
      onCambio();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'no se pudo rotar');
    }
  };
  const guardarOrigenes = async (): Promise<void> => {
    const lista = origenes.split('\n').map((s) => s.trim()).filter(Boolean);
    try {
      await api.adminActualizarProducto(producto.slug, lista);
      setAviso('Orígenes guardados.');
      onCambio();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'no se pudieron guardar los orígenes');
    }
  };

  const ejemplo = `GET https://likekiri.com/modules/clientes/api/entitlement?email=CORREO_DEL_CLIENTE\nHeader  x-api-key: ${producto.apiKey}`;

  return (
    <div className="panel">
      <h2>Integración — {producto.nombre}</h2>
      <p className="muted">
        Clave para que <strong>{producto.slug}</strong> consulte la vigencia de sus clientes. Solo con esta clave y, si viene de
        un navegador, desde los orígenes permitidos.
      </p>
      {aviso !== null && <p className="aviso">{aviso}</p>}

      <label>API key</label>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <code style={{ fontFamily: 'var(--lk-font-mono)', wordBreak: 'break-all' }}>
          {ver ? producto.apiKey : `${producto.apiKey.slice(0, 14)}${'•'.repeat(16)}`}
        </code>
        <button className="boton mini suave" onClick={() => setVer((v) => !v)}>
          {ver ? 'Ocultar' : 'Ver'}
        </button>
        <button className="boton mini suave" onClick={() => void navigator.clipboard?.writeText(producto.apiKey)}>
          Copiar
        </button>
        <button className="boton mini peligro" onClick={() => void rotar()}>
          Rotar
        </button>
      </div>

      <label style={{ marginTop: '1rem' }}>Orígenes permitidos (uno por línea; vacío = solo server-to-server con la clave)</label>
      <textarea rows={2} value={origenes} onChange={(e) => setOrigenes(e.target.value)} placeholder="https://askmypast.com" />
      <div>
        <button className="boton mini" onClick={() => void guardarOrigenes()}>
          Guardar orígenes
        </button>
      </div>

      <label style={{ marginTop: '1rem' }}>Ejemplo de consulta</label>
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.8rem' }}>{ejemplo}</pre>
    </div>
  );
}

// ——— alta manual ———
function AltaCliente({
  producto,
  onCreado,
  onError,
}: {
  producto: ProductoAdmin;
  onCreado: () => void;
  onError: (m: string) => void;
}): ReactElement {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState(producto.planes[0]?.clave ?? '');
  const [ciclo, setCiclo] = useState<Ciclo>('mensual');
  const [inicio, setInicio] = useState(new Date().toISOString().slice(0, 10));

  const planSel = producto.planes.find((p) => p.clave === plan);
  const ciclosOk = ciclosDe(planSel);

  useEffect(() => {
    const primero = producto.planes[0]?.clave ?? '';
    setPlan(primero);
  }, [producto.slug, producto.planes]);
  useEffect(() => {
    if (!ciclosOk.includes(ciclo)) setCiclo(ciclosOk[0] ?? 'mensual');
  }, [plan]); // eslint-disable-line react-hooks/exhaustive-deps

  const crear = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    try {
      await api.adminCrearCliente({ nombre, email, producto: producto.slug, plan, cicloFacturacion: ciclo, inicioVigencia: new Date(inicio).toISOString() });
      setNombre('');
      setEmail('');
      onCreado();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'no se pudo crear el cliente');
    }
  };

  if (producto.planes.length === 0) {
    return (
      <div className="panel">
        <h2>Agregar cliente a {producto.nombre}</h2>
        <p className="muted">Asociá al menos un plan del catálogo a este producto para poder dar de alta clientes.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Agregar cliente a {producto.nombre}</h2>
      <form onSubmit={(e) => void crear(e)} style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', alignItems: 'end' }}>
        <div>
          <label>Nombre</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </div>
        <div>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Plan</label>
          <select value={plan} onChange={(e) => setPlan(e.target.value)}>
            {producto.planes.map((p) => (
              <option key={p.id} value={p.clave}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Facturación</label>
          <select value={ciclo} onChange={(e) => setCiclo(e.target.value as Ciclo)}>
            {ciclosOk.map((c) => (
              <option key={c} value={c}>
                {nombreCiclo(c)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Inicio</label>
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </div>
        <div>
          <button className="boton">Agregar</button>
        </div>
      </form>
    </div>
  );
}

// ——— tabla + edición por fila ———
function TablaClientes({
  producto,
  clientes,
  onCambio,
  onError,
}: {
  producto: ProductoAdmin;
  clientes: ClienteProducto[] | null;
  onCambio: () => void;
  onError: (m: string) => void;
}): ReactElement {
  return (
    <div className="panel">
      <h2>Clientes de {producto.nombre}</h2>
      {clientes === null ? (
        <p className="muted">Cargando…</p>
      ) : clientes.length === 0 ? (
        <p className="muted">Sin clientes en este producto. Agregá uno arriba.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Plan</th>
              <th>Facturación</th>
              <th>Inicio</th>
              <th>Vigencia</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <Fila key={c.id} producto={producto} cliente={c} onCambio={onCambio} onError={onError} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Fila({
  producto,
  cliente,
  onCambio,
  onError,
}: {
  producto: ProductoAdmin;
  cliente: ClienteProducto;
  onCambio: () => void;
  onError: (m: string) => void;
}): ReactElement {
  const [plan, setPlan] = useState(cliente.plan);
  const [ciclo, setCiclo] = useState<Ciclo>(cliente.cicloFacturacion ?? 'mensual');
  const [inicio, setInicio] = useState((cliente.inicioVigencia ?? cliente.creadaEn).slice(0, 10));

  const planSel = producto.planes.find((p) => p.clave === plan);
  const ciclosOk = ciclosDe(planSel);
  const sucio = plan !== cliente.plan || ciclo !== (cliente.cicloFacturacion ?? 'mensual') || inicio !== (cliente.inicioVigencia ?? cliente.creadaEn).slice(0, 10);

  // Mantiene el select en sync si el dato del cliente cambia (p. ej. tras recargar).
  useEffect(() => {
    setPlan(cliente.plan);
    setCiclo(cliente.cicloFacturacion ?? 'mensual');
    setInicio((cliente.inicioVigencia ?? cliente.creadaEn).slice(0, 10));
  }, [cliente.plan, cliente.cicloFacturacion, cliente.inicioVigencia, cliente.creadaEn]);

  useEffect(() => {
    if (!ciclosOk.includes(ciclo)) setCiclo(ciclosOk[0] ?? 'mensual');
  }, [plan]); // eslint-disable-line react-hooks/exhaustive-deps

  const guardar = async (): Promise<void> => {
    try {
      await api.adminEditarCliente(cliente.id, { plan, cicloFacturacion: ciclo, inicioVigencia: new Date(inicio).toISOString() });
      onCambio();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'no se pudo guardar');
    }
  };
  const estado = async (): Promise<void> => {
    try {
      await api.adminEditarCliente(cliente.id, { activo: !cliente.activo });
      onCambio();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'no se pudo cambiar el estado');
    }
  };
  const eliminar = async (): Promise<void> => {
    if (!window.confirm(`¿Eliminar a ${cliente.email} de ${producto.nombre}? No se puede deshacer.`)) return;
    try {
      await api.adminEliminarCliente(cliente.id);
      onCambio();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'no se pudo eliminar');
    }
  };

  const fin = cliente.finVigencia ? cliente.finVigencia.slice(0, 10) : 'Lifetime';
  const planNombre = producto.planes.find((p) => p.clave === cliente.plan)?.nombre ?? cliente.plan;

  return (
    <tr>
      <td>
        <strong>{cliente.nombre}</strong>
        <div className="muted">{cliente.email}</div>
      </td>
      <td>
        <select value={plan} onChange={(e) => setPlan(e.target.value)} title={planNombre}>
          {producto.planes.map((p) => (
            <option key={p.id} value={p.clave}>
              {p.nombre}
            </option>
          ))}
          {plan !== '' && producto.planes.every((p) => p.clave !== plan) && <option value={plan}>{plan} (fuera de catálogo)</option>}
        </select>
      </td>
      <td>
        <select value={ciclo} onChange={(e) => setCiclo(e.target.value as Ciclo)}>
          {ciclosOk.map((c) => (
            <option key={c} value={c}>
              {nombreCiclo(c)}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} style={{ width: '9rem' }} />
      </td>
      <td>
        <span className={`chip ${cliente.vigente ? 'ok' : 'mal'}`}>{cliente.vigente ? 'vigente' : cliente.activo ? 'vencida' : 'suspendida'}</span>
        <div className="muted">{fin}</div>
      </td>
      <td>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {sucio && (
            <button className="boton mini" onClick={() => void guardar()}>
              Guardar
            </button>
          )}
          <button className={`boton mini ${cliente.activo ? 'suave' : ''}`} onClick={() => void estado()}>
            {cliente.activo ? 'Suspender' : 'Reactivar'}
          </button>
          <button className="boton mini peligro" onClick={() => void eliminar()}>
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  );
}
