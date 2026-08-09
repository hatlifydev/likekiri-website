import { useEffect, useState, type FormEvent, type ReactElement } from 'react';

const STORAGE_KEY = 'likekiri:ejemplo-admin:ajustes';

interface Ajustes {
  nombre: string;
  avisos: boolean;
}

/**
 * Segunda página del submenú. Demuestra estado propio del módulo (aquí
 * localStorage; en un módulo real sería tu propia API bajo /api/… del core o
 * un backend tuyo).
 */
export function AjustesPage(): ReactElement {
  const [ajustes, setAjustes] = useState<Ajustes>({ nombre: '', avisos: true });
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw !== null) setAjustes(JSON.parse(raw) as Ajustes);
    } catch {
      // storage corrupto: se parte de los valores por defecto
    }
  }, []);

  const guardar = (event: FormEvent): void => {
    event.preventDefault();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ajustes));
    setGuardado(true);
  };

  return (
    <>
      <h1>Ejemplo — Ajustes</h1>
      <div className="panel">
        <form className="apilada" onSubmit={guardar}>
          <div>
            <label htmlFor="ej-nombre">Nombre a mostrar</label>
            <input
              id="ej-nombre"
              value={ajustes.nombre}
              onChange={(e) => {
                setAjustes({ ...ajustes, nombre: e.target.value });
                setGuardado(false);
              }}
              placeholder="Equipo de ejemplo"
            />
          </div>
          <div>
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={ajustes.avisos}
                onChange={(e) => {
                  setAjustes({ ...ajustes, avisos: e.target.checked });
                  setGuardado(false);
                }}
                style={{ width: 'auto' }}
              />
              Recibir avisos del módulo
            </label>
          </div>
          {guardado && <div className="aviso">Ajustes guardados en este navegador.</div>}
          <button className="boton" type="submit">
            Guardar
          </button>
        </form>
      </div>
    </>
  );
}
