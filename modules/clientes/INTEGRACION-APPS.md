# Integrar una app externa (askmypast) con la vigencia de LikeKiri

La app pregunta a LikeKiri si un cliente tiene plan vigente y **qué plan aplicar**.
LikeKiri ya resuelve la regla "sin plan / vencido → free".

## Endpoint

```
GET https://likekiri.com/modules/clientes/api/entitlement?email=CORREO_DEL_CLIENTE
Header  x-api-key: <API KEY del producto>   (askmypast: lk_askmypast_...)
```

- La API key identifica al producto y es **secreta**: usala desde el **backend** de la app.
- Desde navegador solo funciona si el origen está en "Orígenes permitidos" del producto
  (ya configurado: `https://askmypast.com`), y ahí la key queda expuesta a los usuarios;
  por eso lo recomendado es server-to-server.

## Respuesta

```json
{
  "producto": "askmypast",
  "email": "cliente@correo.com",
  "encontrado": true,
  "vigente": true,
  "plan": "premium",            // plan contratado (aunque esté vencido)
  "planEfectivo": "premium",    // lo que hay que APLICAR (free si venció o no existe)
  "premium": true,              // conveniencia: plan efectivo es premium u onpremise
  "onpremise": false,           // conveniencia: plan efectivo es onpremise
  "features": ["export_pdf"],   // features del plan efectivo (definidas en el generador)
  "cicloFacturacion": "anual",
  "finVigencia": "2027-06-07T..."
}
```

Regla de negocio (ya aplicada por LikeKiri):
- **Sin cliente / sin plan** → `planEfectivo: "free"`, `premium:false`, `onpremise:false`.
- **Plan vencido** (no vigente) → cae a `free` igual.
- **Vigente** → `planEfectivo` = el plan contratado.

## Snippet (backend Node/JS)

```js
const API_KEY = process.env.LIKEKIRI_API_KEY; // lk_askmypast_...
const ENDPOINT = 'https://likekiri.com/modules/clientes/api/entitlement';

/** Devuelve el entitlement del cliente; ante cualquier fallo, degrada a FREE. */
export async function obtenerVigencia(email) {
  try {
    const res = await fetch(`${ENDPOINT}?email=${encodeURIComponent(email)}`, {
      headers: { 'x-api-key': API_KEY },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return { planEfectivo: 'free', premium: false, onpremise: false, features: [] };
  }
}

// Uso al iniciar sesión / al cargar el usuario:
const ent = await obtenerVigencia(usuario.email);
usuario.premium = ent.premium;        // activa/desactiva funciones premium
usuario.onpremise = ent.onpremise;    // activa/desactiva on-premise
// o por feature concreta:
const puedeExportar = ent.features.includes('export_pdf');
```

## Recomendaciones

- **Cachear** el resultado por usuario unos minutos (p. ej. 5–10 min) para no consultar
  en cada request; refrescar al iniciar sesión.
- **Fail-safe a free**: si LikeKiri no responde, tratar al usuario como free (no romper la app).
- Guardar la key en el entorno del backend (no en el bundle del cliente).
